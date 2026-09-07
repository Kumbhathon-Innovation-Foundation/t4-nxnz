import { describe, it, expect } from "vitest";
import { computeDashboardStats } from "../src/lib/stats";
import type { Volunteer } from "../src/lib/types";

function mk(partial: Partial<Volunteer>): Volunteer {
  return {
    volunteer_id: partial.volunteer_id ?? "v_x",
    created_at: partial.created_at ?? "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    name: partial.name ?? "Test",
    dob: "1990-01-01",
    gender: "",
    phone: "9800000000",
    email: "",
    city: "Nashik",
    areas_nashik: [],
    kyc_verified: partial.kyc_verified ?? false,
    aadhaar_number_masked: "",
    aadhaar_verified: false,
    police_verification_status: partial.police_verification_status ?? "pending",
    languages: partial.languages ?? [],
    skills: partial.skills ?? [],
    interests: partial.interests ?? [],
    availability: partial.availability ?? { dates: [], time_slots: [], locations: [] },
    certifications: partial.certifications ?? [],
    transcript_text: partial.transcript_text ?? "",
    story_media_type: partial.story_media_type ?? "none",
    extracted_profile: null,
    score_total: partial.score_total ?? 0,
    skill_scores: partial.skill_scores ?? {},
    score_events: partial.score_events ?? [],
    documents: [],
    onboarding_status: partial.onboarding_status ?? "started",
    consent_flags: [],
  };
}

describe("dashboard stats", () => {
  it("returns zeroed stats for an empty repository", () => {
    const s = computeDashboardStats([]);
    expect(s.totals.registered).toBe(0);
    expect(s.scores.leaderboard).toHaveLength(0);
    expect(s.funnel.find((f) => f.stage === "complete")?.count).toBe(0);
  });

  it("computes totals, funnel, and language tallies", () => {
    const vols = [
      mk({
        volunteer_id: "v_1", name: "A", onboarding_status: "complete", kyc_verified: true,
        police_verification_status: "clear", transcript_text: "story", story_media_type: "audio",
        languages: [
          { language: "Marathi", proficiency: "native", source: "seed" },
          { language: "Hindi", proficiency: "fluent", source: "seed" },
        ],
        skills: [{ name: "swimming", category: "safety", confidence: 0.9, source: "seed" }],
        availability: { dates: [], time_slots: ["Morning (8-12)"], locations: ["Ramkund"] },
        score_total: 20, skill_scores: { swimming: 20 },
        score_events: [{ id: "e1", skill: "swimming", points: 20, reason: "volunteering_session", created_at: "2026-09-01T10:00:00Z" }],
      }),
      mk({
        volunteer_id: "v_2", name: "B", onboarding_status: "started",
        languages: [{ language: "Marathi", proficiency: "basic", source: "seed" }],
        skills: [{ name: "first aid", category: "medical", confidence: 0.8, source: "seed" }],
      }),
      mk({
        volunteer_id: "v_3", name: "C", onboarding_status: "complete", kyc_verified: true,
        transcript_text: "typed story", story_media_type: "none",
        languages: [{ language: "Hindi", proficiency: "conversational", source: "seed" }],
        availability: { dates: [], time_slots: ["Morning (8-12)"], locations: ["Ramkund", "Panchavati"] },
      }),
    ];
    const s = computeDashboardStats(vols);

    expect(s.totals.registered).toBe(3);
    expect(s.totals.complete).toBe(2);
    expect(s.totals.inProgress).toBe(1);
    expect(s.totals.kycVerified).toBe(2);
    expect(s.totals.withStory).toBe(2);

    expect(s.funnel.find((f) => f.stage === "complete")?.count).toBe(2);
    expect(s.funnel.find((f) => f.stage === "identity_pending")?.count).toBe(2);

    const marathi = s.languages.find((l) => l.name === "Marathi")!;
    expect(marathi.count).toBe(2);
    expect(marathi.fluentPlus).toBe(1); // only A is native

    expect(s.skillCategories[0]).toMatchObject({ category: "safety", count: 1 });
    expect(s.skillCategories.find((c) => c.category === "medical")?.count).toBe(1);

    expect(s.topSkills.find((t) => t.name === "swimming")?.count).toBe(1);

    // deployment locations only from complete volunteers: Ramkund x2, Panchavati x1
    expect(s.locations.find((l) => l.name === "Ramkund")?.count).toBe(2);
    expect(s.timeSlots.find((t) => t.name === "Morning (8-12)")?.count).toBe(2);

    expect(s.scores.totalPointsIssued).toBe(20);
    expect(s.scores.volunteersWithScore).toBe(1);
    expect(s.scores.leaderboard[0]).toMatchObject({ name: "A", score_total: 20, top_skills: ["swimming"] });

    expect(s.media.audio).toBe(1);
    expect(s.media.typed).toBe(1); // C has a transcript but no media file → typed
    expect(s.media.none).toBe(1); // B never told a story
  });

  it("sorts leaderboard by score descending", () => {
    const vols = [
      mk({ volunteer_id: "v_low", name: "Low", score_total: 5 }),
      mk({ volunteer_id: "v_high", name: "High", score_total: 50 }),
      mk({ volunteer_id: "v_mid", name: "Mid", score_total: 20 }),
    ];
    const lb = computeDashboardStats(vols).scores.leaderboard;
    expect(lb.map((l) => l.name)).toEqual(["High", "Mid", "Low"]);
  });
});
