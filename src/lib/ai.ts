/**
 * AI service layer — Sarvam-only.
 *
 * STT: Sarvam Saaras v3 (sync REST for <30s clips, batch API for longer).
 * Extraction: sarvam-105b via Sarvam's OpenAI-compatible /v2/chat/completions.
 * TTS: Bulbul v3 (used to synthesize test/demo voices).
 * Embeddings: deterministic local hash embedding (no external dependency; swap-in
 * point for a vector model later).
 *
 * MOCK_AI=true => fully deterministic offline mock so the whole app + test suite
 * run without network access (hackathon demo mode).
 */

const SARVAM_BASE = "https://api.sarvam.ai";

export function mockMode(): boolean {
  return process.env.MOCK_AI === "true" || !process.env.SARVAM_API_KEY;
}

const sarvamKey = () => process.env.SARVAM_API_KEY ?? "";

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(t) };
}

// ---------------- STT (Sarvam Saaras v3) ----------------

export interface SttResult {
  text: string;
  detected_language_code?: string;
  provider: "sarvam" | "mock";
}

/**
 * Transcribe audio/video. Files over ~25s are split client-side into WAV chunks
 * under the 30s sync limit (server-side WAV-frame slicing, no ffmpeg needed),
 * transcribed sequentially, and joined.
 */
export async function transcribe(file: Buffer, mimetype: string): Promise<SttResult> {
  if (mockMode()) {
    return {
      text: "Namaste, mera naam Rahul Deshmukh hai. Main Marathi aur Hindi fluently bolta hoon, thodi English bhi. Main swimming coach hoon Panchavati me, aur pehle Ganesh Utsav me crowd management kiya hai. Main subah 6 se 12 tak available hoon Ramkund ke paas. Ek baar ek bhakt behosh hua tha, maine usse paani diya aur health volunteer ko bulaya.",
      detected_language_code: "mr-IN",
      provider: "mock",
    };
  }

  // Sarvam sync REST limit: 30s per request. Chunk anything longer.
  const wav = parseWav(file);
  if (wav && wav.durationSec > 25) {
    return transcribeChunkedWav(wav, file);
  }
  if (!wav && file.length > 800_000) {
    // Non-WAV (webm/mp4) larger than ~25s heuristic: still try sync once; the
    // browser MediaRecorder output for 1-3 min usually stays well under limits
    // after our 25MB cap. If Sarvam rejects with 400, surface a clear error.
    try {
      return await transcribeSync(file, mimetype);
    } catch (e) {
      throw new Error(
        `Recording too long for one-shot transcription (${e instanceof Error ? e.message : "unknown"}). ` +
        `Please record in shorter takes or use the typed story option.`,
      );
    }
  }
  return transcribeSync(file, mimetype);
}

interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataLength: number;
  durationSec: number;
}

/** Minimal RIFF/WAVE parser — finds fmt + data chunks. */
export function parseWav(buf: Buffer): WavInfo | null {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  let offset = 12;
  let fmt: { sampleRate: number; channels: number; bits: number } | null = null;
  let data: { offset: number; length: number } | null = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "fmt " && offset + 8 + 16 <= buf.length) {
      fmt = {
        channels: buf.readUInt16LE(offset + 10),
        sampleRate: buf.readUInt32LE(offset + 12),
        bits: buf.readUInt16LE(offset + 22),
      };
    } else if (id === "data") {
      data = { offset: offset + 8, length: Math.min(size, buf.length - offset - 8) };
    }
    offset += 8 + size + (size % 2); // chunks are word-aligned
    if (size === 0) break; // guard against malformed files
  }
  if (!fmt || !data || fmt.sampleRate === 0) return null;
  const bytesPerFrame = (fmt.bits / 8) * fmt.channels;
  const durationSec = data.length / (fmt.sampleRate * bytesPerFrame);
  return { ...fmt, bitsPerSample: fmt.bits, dataOffset: data.offset, dataLength: data.length, durationSec };
}

/** Build a complete WAV buffer from raw PCM frames. */
function buildWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(Math.floor((sampleRate * channels * bitsPerSample) / 8), 28);
  header.writeUInt16LE(channels * bitsPerSample, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Slice a WAV into <28s PCM chunks, re-header each, and transcribe in order. */
async function transcribeChunkedWav(wav: WavInfo, file: Buffer): Promise<SttResult> {
  const bytesPerFrame = (wav.bitsPerSample / 8) * wav.channels;
  const maxFrames = Math.floor((27 * wav.sampleRate)); // 27s target, under 30s limit
  const frameSize = bytesPerFrame > 0 ? bytesPerFrame : 2;
  const totalFrames = Math.floor(wav.dataLength / frameSize);
  const pcm = file.subarray(wav.dataOffset, wav.dataOffset + totalFrames * frameSize);

  const chunks: Buffer[] = [];
  for (let start = 0; start < totalFrames; start += maxFrames) {
    const end = Math.min(start + maxFrames, totalFrames);
    chunks.push(buildWav(pcm.subarray(start * frameSize, end * frameSize), wav.sampleRate, wav.channels, wav.bitsPerSample));
  }

  const texts: string[] = [];
  let detected: string | undefined;
  for (let i = 0; i < chunks.length; i++) {
    const result = await transcribeSync(chunks[i], "audio/wav");
    if (result.text.trim()) texts.push(result.text.trim());
    detected = detected ?? result.detected_language_code;
    // tiny gap so we don't hammer the API
    if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 300));
  }
  return { text: texts.join(" "), detected_language_code: detected, provider: "sarvam" };
}

async function transcribeSync(file: Buffer, mimetype: string): Promise<SttResult> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: mimetype }), "story.webm");
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "API-KEY": sarvamKey(), "Authorization": `Bearer ${sarvamKey()}` },
    body: form,
    signal: withTimeout(45_000).signal,
  });
  if (!res.ok) throw new Error(`Sarvam STT failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { transcript?: string; detected_language_code?: string; language_code?: string };
  return {
    text: json.transcript ?? "",
    detected_language_code: json.detected_language_code ?? json.language_code,
    provider: "sarvam",
  };
}

// ---------------- Profile extraction (Sarvam-105B) ----------------

export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    languages_spoken: {
      type: "array",
      items: {
        type: "object",
        properties: {
          language: { type: "string" },
          proficiency: { type: "string", enum: ["basic", "conversational", "fluent", "native"] },
          evidence_quote: { type: "string" },
        },
        required: ["language", "proficiency"],
      },
    },
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string", enum: ["safety", "medical", "language", "crowd", "logistics", "technical", "teaching", "other"] },
          confidence: { type: "number" },
          evidence_quote: { type: "string" },
        },
        required: ["name", "category", "confidence"],
      },
    },
    interests: { type: "array", items: { type: "string" } },
    availability_signals: { type: "array", items: { type: "string" } },
    prior_volunteer_experience: { type: "string" },
    personality_traits: { type: "array", items: { type: "string" } },
    recommended_roles: {
      type: "array",
      items: { type: "string" },
      description: "Map to Kumbh roles: lifeguard, language helper, crowd guide, first-aid support, lost-child assistance, sanitation steward, queue management, etc.",
    },
    red_flags: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["languages_spoken", "skills", "interests", "summary"],
} as const;

const EXTRACTION_SYSTEM_PROMPT = `You are a JSON extraction engine for the Nashik Kumbh Mela 2027 volunteer profiling system.
Output ONLY a single JSON object — no prose, no reasoning, no markdown fences.
Schema:
{"languages_spoken":[{"language":"","proficiency":"basic|conversational|fluent|native","evidence_quote":""}],"skills":[{"name":"","category":"safety|medical|language|crowd|logistics|technical|teaching|other","confidence":0.0,"evidence_quote":""}],"interests":[],"availability_signals":[],"prior_volunteer_experience":"","personality_traits":[],"recommended_roles":[],"red_flags":[],"summary":""}
Rules:
- Ground every language and skill in an evidence_quote copied from the transcript. Never invent skills the person did not mention.
- Proficiency: native > fluent > conversational > basic, judged from self-description and code-mixing.
- confidence per skill: 0-1, based on how explicitly and concretely it was described.
- recommended_roles: map skills to Kumbh-relevant volunteering roles (lifeguard, language helper, crowd guide, first-aid support, lost-child assistance, sanitation steward, queue management, medical support, tech support).
- red_flags: only real safety concerns mentioned (e.g. violence, misconduct). Empty array if none.
- availability_signals: any time-of-day, date, or location hints from the transcript.
- category for swimming/lifesaving skills is "safety". For nursing/first-aid use "medical".
Begin your reply with the character {.`;

export interface ExtractionResult {
  profile: import("./types").ExtractedProfile;
  provider: "sarvam-105b" | "mock";
}

export async function extractProfile(transcript: string, contextHints?: Record<string, unknown>): Promise<ExtractionResult> {
  if (mockMode()) return { profile: mockExtract(transcript), provider: "mock" };

  const userPrompt = [
    `TRANSCRIPT:\n${transcript}`,
    contextHints && Object.keys(contextHints).length
      ? `\nFORM CONTEXT (already provided by volunteer, merge into profile):\n${JSON.stringify(contextHints)}`
      : "",
    "\nOutput the JSON object now.",
  ].join("\n");

  const { signal, clear } = withTimeout(90_000);
  try {
    const res = await fetch(`${SARVAM_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "API-KEY": sarvamKey(),
        "Authorization": `Bearer ${sarvamKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sarvam-105b",
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 8000,
      }),
      signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Sarvam-105b extraction failed: ${res.status} ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Sarvam-105b returned empty extraction");
    return { profile: finalize(parseLooseJson(String(raw)), "sarvam-105b"), provider: "sarvam-105b" };
  } finally {
    clear();
  }
}

/**
 * sarvam-105b is a reasoning model: it may wrap the JSON object in prose or
 * markdown fences. Extract the first balanced {...} block and parse that.
 */
export function parseLooseJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch { /* fall through to brace scan */ }
  const start = trimmed.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model output");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') inStr = !inStr;
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(trimmed.slice(start, i + 1)) as Record<string, unknown>;
    }
  }
  throw new Error("Unbalanced JSON object in model output");
}

function finalize(raw: Record<string, unknown>, provider: string): import("./types").ExtractedProfile {
  return {
    languages_spoken: (raw.languages_spoken as import("./types").ExtractedProfile["languages_spoken"]) ?? [],
    skills: (raw.skills as import("./types").ExtractedProfile["skills"]) ?? [],
    interests: (raw.interests as string[]) ?? [],
    availability_signals: (raw.availability_signals as string[]) ?? [],
    prior_volunteer_experience: (raw.prior_volunteer_experience as string) ?? "",
    personality_traits: (raw.personality_traits as string[]) ?? [],
    recommended_roles: (raw.recommended_roles as string[]) ?? [],
    red_flags: (raw.red_flags as string[]) ?? [],
    summary: (raw.summary as string) ?? "",
    extracted_by: provider,
  };
}

function mockExtract(transcript: string): import("./types").ExtractedProfile {
  const lower = transcript.toLowerCase();
  const skills: import("./types").ExtractedProfile["skills"] = [];
  const add = (name: string, category: import("./types").SkillCategory, quote: string) =>
    skills.push({ name, category, confidence: 0.9, evidence_quote: quote });

  if (lower.includes("swim")) add("swimming", "safety", "swimming coach");
  if (lower.includes("crowd")) add("crowd management", "crowd", "crowd management kiya hai");
  if (lower.includes("first aid") || lower.includes("behosh")) add("first aid basics", "medical", "maine usse paani diya aur health volunteer ko bulaya");
  const languages_spoken: import("./types").ExtractedProfile["languages_spoken"] = [];
  if (lower.includes("marathi")) languages_spoken.push({ language: "Marathi", proficiency: "fluent" });
  if (lower.includes("hindi")) languages_spoken.push({ language: "Hindi", proficiency: "fluent" });
  if (lower.includes("english")) languages_spoken.push({ language: "English", proficiency: "conversational" });

  return {
    languages_spoken,
    skills,
    interests: ["crowd guidance", "pilgrim assistance"],
    availability_signals: ["mornings 6-12", "Ramkund area"],
    prior_volunteer_experience: lower.includes("utsav") || lower.includes("volunteer") ? "Crowd management at Ganesh Utsav" : "",
    personality_traits: ["calm under pressure", "helpful"],
    recommended_roles: ["crowd guide", "language helper", "first-aid support"],
    red_flags: [],
    summary: "Local volunteer with swimming and crowd-management background, fluent in Marathi and Hindi, available mornings near Ramkund.",
    extracted_by: "mock",
  };
}

// ---------------- Embeddings (local deterministic; swap-in point for a vector model) ----------------

/** Deterministic hashed bag-of-words embedding (256 dims, normalized). */
export function hashEmbed(text: string, dims = 256): number[] {
  const vec = new Array(dims).fill(0);
  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    vec[Math.abs(h) % dims] += 1;
  }
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map((x) => x / norm);
}

export async function embed(text: string): Promise<{ vector: number[]; provider: "local" }> {
  return { vector: hashEmbed(text), provider: "local" };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/** Compose the text that gets embedded for a volunteer profile. */
export function profileEmbeddingText(v: import("./types").Volunteer): string {
  const langs = v.languages.map((l) => `${l.language} (${l.proficiency})`).join(", ");
  const skills = v.skills.map((s) => `${s.name} [${s.category}]`).join(", ");
  const roles = v.extracted_profile?.recommended_roles.join(", ") ?? "";
  const traits = v.extracted_profile?.personality_traits.join(", ") ?? "";
  const locs = v.availability.locations.join(", ");
  const slots = v.availability.time_slots.join(", ");
  return [
    `Name: ${v.name}. Languages: ${langs}. Skills: ${skills}. Interests: ${v.interests.join(", ")}.`,
    `Recommended roles: ${roles}. Traits: ${traits}. Locations: ${locs}. Times: ${slots}.`,
    `Summary: ${v.extracted_profile?.summary ?? ""}`,
  ].join(" ");
}

// ---------------- TTS (Bulbul v3) — synthetic test voices ----------------

export interface TtsResult {
  audio: Buffer;
  mimetype: string;
  provider: "bulbul-v3" | "mock";
}

/**
 * Synthesize speech with Sarvam Bulbul v3. Used to generate synthetic volunteer
 * voices for live end-to-end testing of the STT pipeline.
 * model: bulbul:v3 | speakers: aditya, ritu, ashutosh, priya, neha, rahul,
 * pooja, rohan, simran, kavya, amit, dev (v3 set)
 * speech_sample_rate: 8000/16000/22050/24000 (Hz)
 */
export async function synthesizeSpeech(
  text: string,
  opts: { language: string; speaker?: string; sampleRate?: number } = { language: "hi-IN" },
): Promise<TtsResult> {
  if (mockMode()) {
    // Deterministic offline "audio": 16kHz mono WAV header + tone payload
    const durSec = Math.min(10, Math.max(2, text.length / 15));
    const sampleCount = Math.floor(16_000 * durSec);
    const data = Buffer.alloc(sampleCount * 2);
    for (let i = 0; i < sampleCount; i++) {
      data.writeInt16LE(Math.round(6000 * Math.sin((2 * Math.PI * 220 * i) / 16_000)), i * 2);
    }
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16_000, 24);
    header.writeUInt32LE(32_000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(data.length, 40);
    return { audio: Buffer.concat([header, data]), mimetype: "audio/wav", provider: "mock" };
  }

  const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: "POST",
    headers: { "API-KEY": sarvamKey(), "Authorization": `Bearer ${sarvamKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: [text],
      model: "bulbul:v3",
      speaker: opts.speaker ?? "neha",
      speech_sample_rate: opts.sampleRate ?? 16_000,
      target_language_code: opts.language,
    }),
    signal: withTimeout(60_000).signal,
  });
  if (!res.ok) {
    throw new Error(`Bulbul TTS failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { audios?: string[] };
  const b64 = json?.audios?.[0];
  if (!b64) throw new Error("Bulbul TTS returned no audio");
  return { audio: Buffer.from(b64, "base64"), mimetype: "audio/wav", provider: "bulbul-v3" };
}
