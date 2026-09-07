import type { Volunteer } from "./types";

export interface DashboardStats {
  totals: {
    registered: number;
    complete: number;
    inProgress: number;
    kycVerified: number;
    policeClear: number;
    withStory: number;
    withCertificates: number;
  };
  funnel: Array<{ stage: string; label: string; count: number }>;
  languages: Array<{ name: string; count: number; fluentPlus: number }>;
  skillCategories: Array<{ category: string; count: number }>;
  topSkills: Array<{ name: string; count: number; certified: number }>;
  locations: Array<{ name: string; count: number }>;
  timeSlots: Array<{ name: string; count: number }>;
  scores: {
    totalPointsIssued: number;
    avgScore: number;
    volunteersWithScore: number;
    scoreEvents: number;
    leaderboard: Array<{
      volunteer_id: string;
      name: string;
      score_total: number;
      top_skills: string[];
      languages: string[];
      locations: string[];
    }>;
  };
  media: { video: number; audio: number; typed: number; none: number };
  recent: Array<{ volunteer_id: string; name: string; created_at: string; status: string }>;
  interests: Array<{ name: string; count: number }>;
}

const CATEGORY_ORDER = ["safety", "medical", "language", "crowd", "logistics", "technical", "teaching", "other"] as const;

function tally<T extends string>(items: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return m;
}

export function computeDashboardStats(volunteers: Volunteer[]): DashboardStats {
  const complete = volunteers.filter((v) => v.onboarding_status === "complete");

  // funnel
  const statusCounts = tally(volunteers.map((v) => v.onboarding_status));
  const funnelStages: Array<[string, string, number]> = [
    ["started", "Signed up", statusCounts.get("started") ?? 0],
    ["identity_pending", "Verified (KYC)", volunteers.filter((v) => v.kyc_verified).length],
    ["story_pending", "Told their story", volunteers.filter((v) => v.transcript_text.length > 0).length],
    ["details_pending", "Set availability", statusCounts.get("details_pending") ?? 0],
    ["complete", "Fully onboarded", statusCounts.get("complete") ?? 0],
  ];

  // languages
  const langMap = new Map<string, { count: number; fluentPlus: number }>();
  for (const v of volunteers) {
    for (const l of v.languages) {
      const entry = langMap.get(l.language) ?? { count: 0, fluentPlus: 0 };
      entry.count += 1;
      if (l.proficiency === "fluent" || l.proficiency === "native") entry.fluentPlus += 1;
      langMap.set(l.language, entry);
    }
  }
  const languages = Array.from(langMap.entries())
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.count - a.count);

  // skills
  const catMap = tally(volunteers.flatMap((v) => v.skills.map((s) => s.category)));
  const skillCategories = CATEGORY_ORDER
    .filter((c) => catMap.has(c))
    .map((c) => ({ category: c, count: catMap.get(c)! }))
    .sort((a, b) => b.count - a.count);

  const skillMap = new Map<string, { count: number; certified: number }>();
  for (const v of volunteers) {
    for (const s of v.skills) {
      const key = s.name.toLowerCase();
      const entry = skillMap.get(key) ?? { count: 0, certified: 0 };
      entry.count += 1;
      if (s.certified) entry.certified += 1;
      skillMap.set(key, entry);
    }
  }
  const topSkills = Array.from(skillMap.entries())
    .map(([name, e]) => ({ name, ...e }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // locations & time slots (completed volunteers = deployable)
  const locMap = tally(complete.flatMap((v) => v.availability.locations));
  const locations = Array.from(locMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const slotMap = tally(complete.flatMap((v) => v.availability.time_slots));
  const timeSlots = Array.from(slotMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // scores
  const scoreEvents = volunteers.reduce((a, v) => a + v.score_events.length, 0);
  const totalPointsIssued = volunteers.reduce((a, v) => a + v.score_total, 0);
  const withScore = volunteers.filter((v) => v.score_total > 0);
  const leaderboard = [...volunteers]
    .sort((a, b) => b.score_total - a.score_total)
    .slice(0, 10)
    .map((v) => ({
      volunteer_id: v.volunteer_id,
      name: v.name,
      score_total: v.score_total,
      top_skills: Object.entries(v.skill_scores ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k),
      languages: v.languages.slice(0, 3).map((l) => l.language),
      locations: v.availability.locations.slice(0, 2),
    }));

  // story media
  const media = { video: 0, audio: 0, typed: 0, none: 0 };
  for (const v of volunteers) {
    if (!v.transcript_text) media.none += 1;
    else if (v.story_media_type === "video") media.video += 1;
    else if (v.story_media_type === "audio") media.audio += 1;
    else media.typed += 1;
  }

  // interests
  const interestMap = tally(complete.flatMap((v) => v.interests).map((i) => i.toLowerCase()));
  const interests = Array.from(interestMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const recent = [...volunteers]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((v) => ({ volunteer_id: v.volunteer_id, name: v.name, created_at: v.created_at, status: v.onboarding_status }));

  return {
    totals: {
      registered: volunteers.length,
      complete: complete.length,
      inProgress: volunteers.length - complete.length,
      kycVerified: volunteers.filter((v) => v.kyc_verified).length,
      policeClear: volunteers.filter((v) => v.police_verification_status === "clear").length,
      withStory: volunteers.filter((v) => v.transcript_text.length > 0).length,
      withCertificates: volunteers.filter((v) => v.certifications.length > 0).length,
    },
    funnel: funnelStages.map(([stage, label, count]) => ({ stage, label, count })),
    languages,
    skillCategories,
    topSkills,
    locations,
    timeSlots,
    scores: {
      totalPointsIssued,
      avgScore: volunteers.length ? Math.round((totalPointsIssued / volunteers.length) * 10) / 10 : 0,
      volunteersWithScore: withScore.length,
      scoreEvents,
      leaderboard,
    },
    media,
    recent,
    interests,
  };
}
