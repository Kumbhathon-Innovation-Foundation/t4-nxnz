/**
 * LIVE end-to-end test against real Sarvam AI (requires SARVAM_API_KEY).
 * Flow: TTS synthetic voice -> onboarding (with custom/free-text fields) ->
 * real STT -> real sarvam-105b extraction -> documents -> details -> complete
 * -> semantic search -> score events -> partner API.
 *
 * Run: node scripts/live-e2e.mjs   (server must be running on :3000, or set BASE)
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const ADMIN = { Authorization: "Bearer " + (process.env.ADMIN_API_KEY ?? "sevasetu-admin-key") };

let passed = 0, failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

async function jf(url, opts = {}) {
  const res = await fetch(BASE + url, opts);
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body };
}

// ---------- 0. health ----------
console.log("\n— Health —");
const health = await jf("/health");
check("health ok", health.status === 200 && health.body.status === "ok");
check("live AI mode (mock_ai=false)", health.body.mock_ai === false, JSON.stringify(health.body));

// ---------- 1. synthetic voice via Bulbul v3 ----------
console.log("\n— Synthetic voice (Bulbul v3, Marathi, speaker: neha) —");
const storyText =
  "नमस्कार, माझं नाव सुनीता पाटील आहे. मला मराठी आणि हिंदी दोन्ही भाषा सहज येतात. " +
  "मी नर्स आहे आणि मला प्राथमिक उपचार आणि पोहणे माहित आहे. " +
  "मी आधी गणेशोत्सवात स्वयंसेवा केली आहे. " +
  "मी संध्याकाळी त्र्यंबकेश्वर मंदिर आणि रामकुंड जवळ सेवा करू शकते. " +
  "एकदम एक भक्त बेशुद्ध पडला होता, मी त्याला पाणी दिलं आणि डॉक्टरला हाक मारली.";
const ttsRes = await fetch("https://api.sarvam.ai/text-to-speech", {
  method: "POST",
  headers: { "API-KEY": process.env.SARVAM_API_KEY, "Authorization": "Bearer " + process.env.SARVAM_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    inputs: [storyText],
    model: "bulbul:v3",
    speaker: "neha",
    speech_sample_rate: 16000,
    target_language_code: "mr-IN",
  }),
});
const ttsJson = await ttsRes.json();
check("TTS 200 + audio", ttsRes.ok && !!ttsJson.audios?.[0], JSON.stringify(ttsJson).slice(0, 150));
const voice = Buffer.from(ttsJson.audios[0], "base64");
console.log(`  voice: ${(voice.length / 1024).toFixed(0)} KB WAV (~${(voice.length / 32000).toFixed(0)}s) — real Bulbul v3 synthetic speech`);

// ---------- 2. onboarding: signup with custom details ----------
console.log("\n— Onboarding: signup —");
const signup = await jf("/api/onboarding", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Sunita Patil (Live Test)",
    dob: "1991-08-21",
    gender: "female",
    phone: "9822033445",
    email: "sunita.live@example.com",
  }),
});
check("signup 201", signup.status === 201, JSON.stringify(signup.body));
const vid = signup.body.volunteer_id;

// ---------- 3. KYC ----------
console.log("\n— KYC + police (demo placeholders) —");
const kyc = await jf("/api/onboarding/identity", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ volunteer_id: vid, aadhaar_number: "456789123045" }),
});
check("KYC verified (demo)", kyc.status === 200 && kyc.body.kyc_verified === true && kyc.body.police_verification_status === "clear");

// ---------- 4. story: REAL STT + REAL extraction ----------
console.log("\n— Story: live Sarvam pipeline (saaras:v3 STT → sarvam-105b extraction) —");
const fd = new FormData();
fd.append("volunteer_id", vid);
fd.append("media", new Blob([voice], { type: "audio/wav" }), "story.wav");
fd.append("media_type", "audio");
const t0 = Date.now();
const story = await jf("/api/onboarding/story", { method: "POST", body: fd });
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`  pipeline took ${secs}s`);
check("story 200", story.status === 200, JSON.stringify(story.body).slice(0, 300));
if (story.status !== 200) process.exit(1);
console.log(`  STT provider: ${story.body.stt_provider}`);
console.log(`  extraction provider: ${story.body.extraction_provider}`);
console.log(`  transcript: ${story.body.transcript.slice(0, 120)}…`);
check("transcript is real STT (contains name)", /सुनीता|sunita/i.test(story.body.transcript));
check("extraction live (sarvam-105b)", story.body.extraction_provider === "sarvam-105b", story.body.extraction_provider);
const prof = story.body.profile;
console.log(`  languages: ${(prof.languages_spoken ?? []).map((l) => l.language + ":" + l.proficiency).join(", ")}`);
console.log(`  skills: ${(prof.skills ?? []).map((s) => s.name + "(" + s.category + "," + s.confidence + ")").join(", ")}`);
console.log(`  roles: ${(prof.recommended_roles ?? []).join(", ")}`);
check("≥2 languages extracted", (prof.languages_spoken ?? []).length >= 2);
check("≥2 skills extracted", (prof.skills ?? []).length >= 2);
check("swimming/first-aid/nursing detected", (prof.skills ?? []).some((s) => /swim|po|first.?aid|nurs/i.test(s.name + s.category)));

// ---------- 5. custom fields: interests chips + free text + multiple locations/slots ----------
console.log("\n— Details: custom fields (free-text interest, multi-select, custom date) —");
const details = await jf("/api/onboarding/details", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    volunteer_id: vid,
    availability: {
      dates: ["2027-08-11", "2027-09-05"],
      time_slots: ["Evening (16-20)", "Night (20-24)"],
      locations: ["Trimbakeshwar Temple", "Ramkund", "Custom Ghat near Panchak"], // custom location allowed
    },
    interests: ["First-aid support", "Language helper"],
    interest_free_text: "Can teach basic Marathi phrases to out-of-state pilgrims", // custom free-text line
  }),
});
check("details 200 + complete", details.status === 200 && details.body.onboarding_status === "complete");
check("custom free-text interest saved", (details.body.interests ?? []).includes("Can teach basic Marathi phrases to out-of-state pilgrims"));
check("custom location saved", (details.body.availability?.locations ?? []).includes("Custom Ghat near Panchak"));

// details validation: must reject empty locations
const badDetails = await jf("/api/onboarding/details", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ volunteer_id: vid, availability: { time_slots: ["Morning (8-12)"], locations: [] } }),
});
check("details validation rejects empty locations", badDetails.status === 422);

// ---------- 6. documents with custom-named files ----------
console.log("\n— Documents —");
const docFd = new FormData();
docFd.append("volunteer_id", vid);
docFd.append("files", new Blob(["%PDF-1.4 nursing council registration"], { type: "application/pdf" }), "nursing-council-2024.pdf");
docFd.append("files", new Blob(["%PDF-1.4 advanced swimming"], { type: "application/pdf" }), "aquatic-rescue.pdf");
const docs = await jf("/api/onboarding/documents", { method: "POST", body: docFd });
check("documents 200 (2 saved)", docs.status === 200 && docs.body.documents.length === 2);
check("nursing cert classified medical", (docs.body.documents ?? []).some((d) => /medical|First Aid|Nurs/i.test(d.title + d.category)));

// ---------- 7. complete + welcome ----------
console.log("\n— Completion —");
const done = await jf("/api/onboarding/complete", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ volunteer_id: vid }),
});
check("complete 200, score 0", done.status === 200 && done.body.score_total === 0);
console.log(`  AI summary: ${done.body.summary?.slice(0, 140)}`);

// ---------- 8. partner API: semantic search finds her live ----------
console.log("\n— Partner API: semantic search (live) —");
const search = await jf("/v1/volunteers/search", {
  method: "POST",
  headers: { Authorization: "Bearer sk_demo_dispatch_key_2027", "Content-Type": "application/json" },
  body: JSON.stringify({ query: "nurse who knows first aid and swimming, free in the evening near Trimbakeshwar", top_k: 5 }),
});
check("search 200", search.status === 200);
const hit = (search.body.results ?? []).find((r) => r.volunteer_id === vid);
check("new volunteer found semantically", !!hit, `results: ${(search.body.results ?? []).length}`);
if (hit) console.log(`  match: ${hit.name} (score ${hit.match_score}) — ${hit.match_explanation?.slice(0, 110)}`);

// filtered search with custom location token
const locSearch = await jf("/v1/volunteers?location=trimbakeshwar", { headers: { Authorization: "Bearer sk_demo_dispatch_key_2027" } });
check("filtered search finds volunteer", (locSearch.body.volunteers ?? []).some((v) => v.volunteer_id === vid));

// ---------- 9. score events (dispatch simulation) ----------
console.log("\n— Score engine (dispatch simulation) —");
const PARTNER = { Authorization: "Bearer sk_demo_dispatch_key_2027", "Content-Type": "application/json" };
const ev1 = await jf(`/v1/volunteers/${vid}/score-events`, {
  method: "POST", headers: PARTNER,
  body: JSON.stringify({ skill: "first aid", category: "medical", reason: "volunteering_session" }),
});
check("medical session +15 (×1.5 scarce)", ev1.status === 201 && ev1.body.event.points === 15, JSON.stringify(ev1.body).slice(0, 150));
const ev2 = await jf(`/v1/volunteers/${vid}/score-events`, {
  method: "POST", headers: PARTNER,
  body: JSON.stringify({ skill: "first aid", category: "medical", reason: "volunteering_session" }),
});
const ev3 = await jf(`/v1/volunteers/${vid}/score-events`, {
  method: "POST", headers: PARTNER,
  body: JSON.stringify({ skill: "first aid", category: "medical", reason: "volunteering_session" }),
});
check("3 sessions → consistency bonus (45 + 5)", ev3.body.skill_scores?.["first aid"] === 50, `got ${ev3.body.skill_scores?.["first aid"]} (expect 15×3+5)`);
// score_total = 50 (skill) + 10 (2 certs × 5, capped 15/category) = 60
check("score_total = 60 (skill 50 + certification bonus 10)", ev3.body.score_total === 60, `got ${ev3.body.score_total}`);

// ledger
const ledger = await jf(`/v1/volunteers/${vid}/score-events`, { headers: { Authorization: "Bearer sk_demo_dispatch_key_2027" } });
check("ledger has 3 events", (ledger.body.events ?? []).length === 3);

// ---------- 10. full profile privacy ----------
console.log("\n— Privacy scoping —");
const pub = await jf(`/v1/volunteers/${vid}`, { headers: { Authorization: "Bearer sk_demo_dispatch_key_2027" } });
check("public profile hides phone", pub.body.volunteer.phone === undefined);
const full = await jf(`/v1/volunteers/${vid}?full=true`, { headers: { Authorization: "Bearer sk_demo_dispatch_key_2027" } });
check("full profile shows phone (scoped)", full.body.volunteer.phone === "9822033445");

// ---------- 11. similar volunteers ----------
const similar = await jf(`/v1/volunteers/${vid}/similar`, { headers: { Authorization: "Bearer sk_demo_dispatch_key_2027" } });
check("similar volunteers 200", similar.status === 200 && Array.isArray(similar.body.similar));

console.log(`\n════════════════════════════════`);
console.log(`  LIVE E2E: ${passed} passed, ${failed} failed`);
console.log(`════════════════════════════════`);
process.exit(failed ? 1 : 0);
