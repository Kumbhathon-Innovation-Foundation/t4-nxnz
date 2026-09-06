import { repo } from "../src/lib/repository";
import type { Volunteer, ExtractedProfile } from "../src/lib/types";
import { profileEmbeddingText } from "../src/lib/ai";
import { hashEmbedLocal } from "./embedding-fallback";

function mkVolunteer(partial: Partial<Volunteer> & { volunteer_id: string; name: string }): Volunteer {
  const now = new Date().toISOString();
  return {
    volunteer_id: partial.volunteer_id,
    created_at: now,
    updated_at: now,
    name: partial.name,
    dob: partial.dob ?? "1995-01-01",
    gender: partial.gender ?? "",
    phone: partial.phone ?? "9800000000",
    email: partial.email ?? "",
    city: "Nashik",
    areas_nashik: partial.areas_nashik ?? [],
    kyc_verified: true,
    aadhaar_number_masked: "XXXX XXXX 1234",
    aadhaar_verified: true,
    police_verification_status: "clear",
    languages: partial.languages ?? [],
    skills: partial.skills ?? [],
    interests: partial.interests ?? [],
    availability: partial.availability ?? { dates: [], time_slots: [], locations: [] },
    certifications: partial.certifications ?? [],
    transcript_text: partial.transcript_text ?? "",
    story_media_type: partial.story_media_type ?? "audio",
    extracted_profile: partial.extracted_profile ?? null,
    score_total: 0,
    skill_scores: {},
    score_events: [],
    documents: [],
    onboarding_status: "complete",
    consent_flags: ["data_processing_consent", "seed"],
  };
}

const seeds: Volunteer[] = [
  mkVolunteer({
    volunteer_id: "v_seed_rahul",
    name: "Rahul Deshmukh",
    languages: [
      { language: "Marathi", proficiency: "native", source: "seed" },
      { language: "Hindi", proficiency: "fluent", source: "seed" },
      { language: "English", proficiency: "conversational", source: "seed" },
    ],
    skills: [
      { name: "swimming", category: "safety", confidence: 0.95, source: "seed", certified: true },
      { name: "crowd management", category: "crowd", confidence: 0.85, source: "seed" },
      { name: "first aid basics", category: "medical", confidence: 0.7, source: "seed" },
    ],
    interests: ["Lifeguard", "Crowd guide"],
    availability: { dates: [], time_slots: ["Morning (8-12)"], locations: ["Ramkund", "Godavari Ghats"] },
    certifications: [{ id: "doc_c1", title: "Swimming / Lifesaving Certificate", category: "safety", filename: "swim.pdf", mimetype: "application/pdf", uploaded_at: new Date().toISOString() }],
    extracted_profile: {
      languages_spoken: [{ language: "Marathi", proficiency: "native" }, { language: "Hindi", proficiency: "fluent" }],
      skills: [{ name: "swimming", category: "safety", confidence: 0.95 }, { name: "crowd management", category: "crowd", confidence: 0.85 }],
      interests: ["lifeguarding"], availability_signals: ["mornings"], prior_volunteer_experience: "Ganesh Utsav crowd management",
      personality_traits: ["calm under pressure"], recommended_roles: ["lifeguard", "crowd guide"], red_flags: [],
      summary: "Swimming coach and Utsav volunteer; strong Marathi/Hindi; mornings near Ramkund.", extracted_by: "seed",
    } as ExtractedProfile,
  }),
  mkVolunteer({
    volunteer_id: "v_seed_meera",
    name: "Meera Kulkarni",
    languages: [
      { language: "Marathi", proficiency: "native", source: "seed" },
      { language: "Hindi", proficiency: "native", source: "seed" },
      { language: "Telugu", proficiency: "conversational", source: "seed" },
    ],
    skills: [
      { name: "language helper", category: "language", confidence: 0.9, source: "seed" },
      { name: "teaching", category: "teaching", confidence: 0.8, source: "seed" },
      { name: "lost-child assistance", category: "crowd", confidence: 0.75, source: "seed" },
    ],
    interests: ["Language helper", "Lost-child assistance"],
    availability: { dates: [], time_slots: ["Morning (8-12)", "Evening (16-20)"], locations: ["Trimbakeshwar Temple", "Panchavati"] },
    extracted_profile: {
      languages_spoken: [{ language: "Marathi", proficiency: "native" }, { language: "Hindi", proficiency: "native" }],
      skills: [{ name: "language helper", category: "language", confidence: 0.9 }],
      interests: ["translation"], availability_signals: ["mornings and evenings"], prior_volunteer_experience: "School teacher",
      personality_traits: ["patient", "empathetic"], recommended_roles: ["language helper", "lost-child assistance"], red_flags: [],
      summary: "Retired school teacher, trilingual, great with children and elderly pilgrims.", extracted_by: "seed",
    } as ExtractedProfile,
  }),
  mkVolunteer({
    volunteer_id: "v_seed_arjun",
    name: "Arjun Shinde",
    languages: [
      { language: "Marathi", proficiency: "native", source: "seed" },
      { language: "Hindi", proficiency: "conversational", source: "seed" },
    ],
    skills: [
      { name: "first aid", category: "medical", confidence: 0.95, source: "seed", certified: true },
      { name: "crowd management", category: "crowd", confidence: 0.8, source: "seed" },
      { name: "route navigation", category: "logistics", confidence: 0.7, source: "seed" },
    ],
    interests: ["First-aid support", "Queue management"],
    availability: { dates: [], time_slots: ["Full day"], locations: ["Nashik Road Railway Station", "Central Bus Stand"] },
    certifications: [{ id: "doc_c2", title: "First Aid / Medical Certificate", category: "medical", filename: "firstaid.pdf", mimetype: "application/pdf", uploaded_at: new Date().toISOString() }],
    extracted_profile: {
      languages_spoken: [{ language: "Marathi", proficiency: "native" }],
      skills: [{ name: "first aid", category: "medical", confidence: 0.95 }],
      interests: ["medical support"], availability_signals: ["full day"], prior_volunteer_experience: "Red Cross volunteer",
      personality_traits: ["quick decision maker"], recommended_roles: ["first-aid support", "queue management"], red_flags: [],
      summary: "Certified first-aider, Red Cross background, can serve full days at transit hubs.", extracted_by: "seed",
    } as ExtractedProfile,
  }),
  mkVolunteer({
    volunteer_id: "v_seed_priya",
    name: "Priya Patil",
    languages: [
      { language: "Marathi", proficiency: "native", source: "seed" },
      { language: "English", proficiency: "fluent", source: "seed" },
      { language: "Gujarati", proficiency: "conversational", source: "seed" },
    ],
    skills: [
      { name: "sign language", category: "language", confidence: 0.85, source: "seed", certified: true },
      { name: "elderly support", category: "other", confidence: 0.8, source: "seed" },
    ],
    interests: ["Elderly & accessibility support", "Language helper"],
    availability: { dates: [], time_slots: ["Evening (16-20)"], locations: ["Kalaram Temple", "Panchavati"] },
    certifications: [{ id: "doc_c3", title: "Language Proficiency Certificate", category: "language", filename: "signlang.pdf", mimetype: "application/pdf", uploaded_at: new Date().toISOString() }],
    extracted_profile: {
      languages_spoken: [{ language: "English", proficiency: "fluent" }, { language: "Gujarati", proficiency: "conversational" }],
      skills: [{ name: "sign language", category: "language", confidence: 0.85 }],
      interests: ["accessibility"], availability_signals: ["evenings"], prior_volunteer_experience: "NGO for deaf children",
      personality_traits: ["patient", "warm"], recommended_roles: ["language helper", "elderly support"], red_flags: [],
      summary: "Sign-language certified volunteer focused on accessibility and elderly care.", extracted_by: "seed",
    } as ExtractedProfile,
  }),
  mkVolunteer({
    volunteer_id: "v_seed_vikram",
    name: "Vikram Jadhav",
    languages: [
      { language: "Hindi", proficiency: "native", source: "seed" },
      { language: "Marathi", proficiency: "fluent", source: "seed" },
    ],
    skills: [
      { name: "crowd management", category: "crowd", confidence: 0.9, source: "seed" },
      { name: "tech support", category: "technical", confidence: 0.75, source: "seed" },
      { name: "queue management", category: "crowd", confidence: 0.85, source: "seed" },
    ],
    interests: ["Queue management", "Tech support desk"],
    availability: { dates: [], time_slots: ["Night (20-24)"], locations: ["Godavari Ghats", "Dwarka"] },
    extracted_profile: {
      languages_spoken: [{ language: "Hindi", proficiency: "native" }],
      skills: [{ name: "crowd management", category: "crowd", confidence: 0.9 }],
      interests: ["logistics tech"], availability_signals: ["nights"], prior_volunteer_experience: "College fest core team",
      personality_traits: ["organised"], recommended_roles: ["queue management", "tech support desk"], red_flags: [],
      summary: "Engineering student, night-shift crowd and tech support volunteer.", extracted_by: "seed",
    } as ExtractedProfile,
  }),
];

async function main() {
  for (const v of seeds) {
    if (repo.get(v.volunteer_id)) {
      console.log(`skip (exists): ${v.volunteer_id}`);
      continue;
    }
    // Offline-deterministic embedding for seeds (no network in seed).
    const vector = hashEmbedLocal(profileEmbeddingText(v));
    await repo.insert(v, vector);
    console.log(`seeded: ${v.volunteer_id} (${v.name})`);
  }
  // Seed partner demo key for API demos
  await repo.upsertPartner({
    partner_id: "p_demo_dispatch",
    name: "Demo Dispatch App",
    api_key: "sk_demo_dispatch_key_2027",
    scopes: ["read:public", "search:volunteers", "read:profiles", "write:score-events"],
  });
  console.log("seeded demo partner key: sk_demo_dispatch_key_2027");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
