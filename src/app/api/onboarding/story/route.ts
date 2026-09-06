import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { apiError } from "@/lib/api-utils";
import { transcribe, extractProfile, embed, profileEmbeddingText, mockMode } from "@/lib/ai";
import type { ExtractedProfile, LanguageProficiency, SkillCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID_PROFICIENCY: LanguageProficiency[] = ["basic", "conversational", "fluent", "native"];
const VALID_CATEGORIES: SkillCategory[] = ["safety", "medical", "language", "crowd", "logistics", "technical", "teaching", "other"];

/**
 * POST /api/onboarding/story — multipart form:
 *   volunteer_id, media (video/webm or audio file), or transcript override (text).
 * Pipeline: Sarvam Saaras v3 STT → profile extraction (sarvam-105b)
 * → embedding → persist. Mock mode when no keys.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "bad_request", "Expected multipart/form-data");
  }

  const volunteerId = String(form.get("volunteer_id") ?? "");
  const v = repo.get(volunteerId);
  if (!v) return apiError(404, "not_found", "No such onboarding session");

  const media = form.get("media");
  const transcriptOverride = String(form.get("transcript") ?? "").trim();

  let transcript = "";
  let detectedLanguage: string | undefined;
  let provider = "text";

  if (transcriptOverride) {
    // Demo/dev path: direct text input (skip STT)
    transcript = transcriptOverride;
  } else if (media && media instanceof File && media.size > 0) {
    if (media.size > 25 * 1024 * 1024) return apiError(413, "payload_too_large", "Media must be under 25MB");
    try {
      const buf = Buffer.from(await media.arrayBuffer());
      const stt = await transcribe(buf, media.type || "audio/webm");
      transcript = stt.text;
      detectedLanguage = stt.detected_language_code;
      provider = stt.provider;
    } catch (e) {
      return apiError(502, "stt_failed", `Transcription failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  } else {
    return apiError(422, "validation_error", "Provide a media file or transcript text");
  }

  if (!transcript.trim()) return apiError(422, "stt_empty", "Transcription produced empty text — try recording again or type your story instead.");

  // Profile extraction (dual provider inside ai.ts)
  let profile: ExtractedProfile;
  try {
    const contextHints = {
      name: v.name,
      city: v.city,
      areas_nashik: v.areas_nashik,
      form_languages: v.languages.map((l) => l.language),
      availability: v.availability,
    };
    const result = await extractProfile(transcript, contextHints);
    profile = result.profile;
    provider = result.provider;
  } catch (e) {
    // Never dead-end: fall back to a minimal profile so onboarding continues
    profile = {
      languages_spoken: [],
      skills: [],
      interests: [],
      availability_signals: [],
      prior_volunteer_experience: "",
      personality_traits: [],
      recommended_roles: [],
      red_flags: [],
      summary: "",
      extracted_by: "fallback_manual",
    };
    if (!mockMode()) console.error("extraction failed, using manual fallback:", e);
  }

  // Merge detected language signal
  if (detectedLanguage && !profile.languages_spoken.some((l) => l.language === detectedLanguage)) {
    profile.languages_spoken.unshift({
      language: detectedLanguage.split("-")[0].toUpperCase(),
      proficiency: "conversational",
    });
  }

  // Build structured languages/skills for the volunteer record
  const languages = profile.languages_spoken.map((l) => ({
    language: l.language,
    proficiency: VALID_PROFICIENCY.includes(l.proficiency) ? l.proficiency : ("conversational" as LanguageProficiency),
    evidence_quote: l.evidence_quote,
    source: "voice_story" as const,
  }));
  const skills = profile.skills.map((s) => ({
    name: s.name,
    category: VALID_CATEGORIES.includes(s.category) ? s.category : ("other" as SkillCategory),
    confidence: Math.min(1, Math.max(0, s.confidence)),
    evidence_quote: s.evidence_quote,
    source: "voice_story" as const,
  }));

  const draft: Partial<import("@/lib/types").Volunteer> = {
    transcript_text: transcript,
    story_media_type: (String(form.get("media_type") ?? "audio") as "video" | "audio"),
    extracted_profile: profile,
    languages,
    skills,
    onboarding_status: "details_pending",
  };

  const updated = await repo.update(volunteerId, draft);

  // Embedding (best-effort; failures don't block onboarding)
  let embedded = false;
  try {
    const { vector } = await embed(profileEmbeddingText({ ...updated, ...draft } as import("@/lib/types").Volunteer));
    await repo.update(volunteerId, {}, vector);
    embedded = true;
  } catch (e) {
    console.error("embedding failed (non-blocking):", e);
  }

  return NextResponse.json({
    volunteer_id: volunteerId,
    transcript: transcript,
    stt_provider: provider,
    extraction_provider: profile.extracted_by,
    embedded,
    profile,
    languages,
    skills,
  });
}
