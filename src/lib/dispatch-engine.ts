/**
 * Dispatch matching engine — pure functions, no I/O.
 *
 * Ranks volunteers for a need by combining:
 *   1. Skill relevance      (semantic embedding similarity of the volunteer's
 *                           profile vs the need query + direct skill hits)  — 35%
 *   2. Per-skill Seva Score (proven performance in exactly this skill)       — 25%
 *   3. Proximity            (haversine distance vs the need radius)          — 20%
 *   4. Language match       (any required language at conversational+)       — 15%
 *   5. Availability         (time-slot overlap with the need window)          — 5%
 * Hard filters: verification, urgency response caps, per-need exclusions.
 */
import type { Need, MatchBreakdown } from "./dispatch-types";
import type { Volunteer } from "./types";
import { cosineSimilarity } from "./ai";

export const MATCH_WEIGHTS = {
  skill_semantic: 0.35,
  score: 0.25,
  proximity: 0.2,
  language: 0.15,
  availability: 0.05,
} as const;

/** Urgency caps how busy a volunteer is allowed to already be. */
export const URGENCY_ACTIVE_CAP: Record<Need["urgency"], number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const PROFICIENCY_RANK: Record<string, number> = { basic: 1, conversational: 2, fluent: 3, native: 4 };

/** Direct skill hit: need-required skill appears in the volunteer's skills (fuzzy). */
export function skillHit(volunteer: Volunteer, requiredSkills: string[]): { hit: boolean; matched: string } {
  for (const req of requiredSkills) {
    const rl = req.toLowerCase();
    for (const s of volunteer.skills) {
      const sl = s.name.toLowerCase();
      if (sl.includes(rl) || rl.includes(sl) || sl.split(/\s+/).some((w) => w.length > 3 && rl.includes(w))) {
        return { hit: true, matched: s.name };
      }
    }
  }
  return { hit: false, matched: "" };
}

/** Best per-skill score for the required skills (0 if none). */
export function relevantSkillScore(volunteer: Volunteer, requiredSkills: string[]): number {
  let best = 0;
  for (const [skill, score] of Object.entries(volunteer.skill_scores ?? {})) {
    if (requiredSkills.some((r) => skill.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(skill.toLowerCase()))) {
      best = Math.max(best, score);
    }
  }
  return best;
}

export function languageMatch(volunteer: Volunteer, requiredLanguages: string[]): boolean {
  if (!requiredLanguages.length) return true;
  return volunteer.languages.some(
    (l) =>
      requiredLanguages.some((r) => l.language.toLowerCase().includes(r.toLowerCase())) &&
      (PROFICIENCY_RANK[l.proficiency] ?? 0) >= PROFICIENCY_RANK.conversational,
  );
}

/** Does the volunteer's availability overlap the need's time-of-day window? */
export function timeOverlap(volunteer: Volunteer, need: Need): boolean {
  const slots = volunteer.availability?.time_slots ?? [];
  if (!slots.length) return true; // unknown = give benefit of doubt, penalized in scoring
  // crude but effective: check any slot keyword appears in the need window label
  const win = `${need.time_window?.start ?? ""} ${need.time_window?.end ?? ""}`.toLowerCase();
  const hourOf = (t: string): number => {
    const m = t.match(/(\d{1,2})/);
    return m ? parseInt(m[1], 10) : 12;
  };
  const startH = hourOf(need.time_window?.start ?? "00:00");
  const endH = hourOf(need.time_window?.end ?? "23:59");
  const covers = (slot: string): boolean => {
    const s = slot.toLowerCase();
    const nums = s.match(/\d+/g)?.map(Number) ?? [];
    if (s.includes("full day")) return true;
    if (nums.length >= 2) return nums[0] < endH && nums[1] > startH; // e.g. "Morning (8-12)"
    return win.includes(s.split(" ")[0]);
  };
  return slots.some(covers);
}

export interface RankContext {
  need: Need;
  /** embedding of "need.title + description + required_skills" (from caller) */
  needEmbedding: number[];
  /** embedding lookups for volunteers */
  volunteerEmbedding: (volunteerId: string) => number[] | undefined;
  /** active (allocated/checked_in) assignment count per volunteer id */
  activeAssignments: (volunteerId: string) => number;
  /** volunteer ids already assigned to THIS need (excluded) */
  alreadyAssigned: Set<string>;
  /** now, for tests */
  now?: Date;
}

export function scoreVolunteer(v: Volunteer, ctx: RankContext): MatchBreakdown {
  const { need } = ctx;
  const reasons: string[] = [];
  const warnings: string[] = [];

  // hard filters
  const active = ctx.activeAssignments(v.volunteer_id);
  const cap = URGENCY_ACTIVE_CAP[need.urgency];
  const available = active < cap && !ctx.alreadyAssigned.has(v.volunteer_id);
  if (active >= cap) warnings.push(`busy (${active} active)`);
  if (ctx.alreadyAssigned.has(v.volunteer_id)) warnings.push("already on this need");

  // 1. semantic skill relevance
  const emb = ctx.volunteerEmbedding(v.volunteer_id);
  const semantic = emb ? Math.max(0, cosineSimilarity(ctx.needEmbedding, emb)) : 0;
  const semanticNorm = Math.min(1, semantic / 0.6); // 0.6+ cosine ≈ perfect

  // direct skill hits reinforce
  const hit = skillHit(v, need.required_skills);
  const semanticScore = Math.min(1, semanticNorm + (hit.hit ? 0.35 : 0));
  if (hit.hit) reasons.push(`skill match: ${hit.matched}`);
  if (semanticNorm > 0.5) reasons.push("profile strongly relevant");

  // 2. per-skill score (log-scaled 0..1, 100+ pts ≈ 1.0)
  const skillScore = relevantSkillScore(v, need.required_skills);
  const scoreNorm = Math.min(1, Math.log10(1 + skillScore) / 2);
  if (skillScore >= 30) reasons.push(`proven: ${skillScore} pts in ${need.required_skills[0] ?? "domain"}`);
  if (v.score_total === 0) warnings.push("new volunteer (score 0)");

  // 3. proximity
  const dist = haversineM(v.availability?.locations ? need.lat : need.lat, need.lng, need.lat, need.lng); // placeholder, replaced below
  void dist;
  // volunteer locations are place-name strings; map to coordinates via caller-provided fn
  const distanceM = ctxNeedDistance(v, ctx);
  const proximity = Math.max(0, 1 - distanceM / Math.max(500, need.radius_m * 3));
  if (distanceM <= need.radius_m) reasons.push(`at ${need.location_name} (${fmtM(distanceM)})`);
  else if (distanceM <= need.radius_m * 3) reasons.push(`nearby (${fmtM(distanceM)})`);

  // 4. language
  const langOk = languageMatch(v, need.languages_required);
  if (langOk && need.languages_required.length) reasons.push(`speaks ${need.languages_required.join("/")}`);

  // 5. availability
  const availOk = timeOverlap(v, need);
  if (!availOk) warnings.push("schedule may not match");

  // verification gate bonus
  const verified = v.kyc_verified && v.police_verification_status === "clear";
  if (!verified) warnings.push("verification incomplete");

  const final =
    (semanticScore * MATCH_WEIGHTS.skill_semantic +
      scoreNorm * MATCH_WEIGHTS.score +
      proximity * MATCH_WEIGHTS.proximity +
      (langOk ? 1 : 0) * MATCH_WEIGHTS.language +
      (availOk ? 1 : 0) * MATCH_WEIGHTS.availability) *
    (verified ? 1 : 0.5) * // soft-penalize unverified
    (available ? 1 : 0.15); // busy volunteers sink but stay visible

  return {
    volunteer_id: v.volunteer_id,
    name: v.name,
    skill_score: skillScore,
    base_score: v.score_total,
    distance_m: Math.round(distanceM),
    available,
    language_match: langOk,
    embedding_similarity: Math.round(semantic * 1000) / 1000,
    final_score: Math.round(final * 1000) / 1000,
    reasons,
    warnings,
  };
}

/** Map a volunteer's location strings to distance from the need. Uses a
 * gazetteer injected by the caller so the engine stays pure. */
let gazetteer: Record<string, { lat: number; lng: number }> = {};
export function setLocationGazetteer(g: Record<string, { lat: number; lng: number }>) {
  gazetteer = g;
}
export function getLocationGazetteer() {
  return gazetteer;
}

function ctxNeedDistance(v: Volunteer, ctx: RankContext): number {
  const locs = v.availability?.locations ?? [];
  if (!locs.length) return ctx.need.radius_m * 2.5; // unknown location: mid penalty
  let best = Infinity;
  for (const loc of locs) {
    const key = Object.keys(gazetteer).find((k) => loc.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(loc.toLowerCase()));
    const coord = key ? gazetteer[key] : undefined;
    if (coord) {
      best = Math.min(best, haversineM(coord.lat, coord.lng, ctx.need.lat, ctx.need.lng));
    }
  }
  if (best === Infinity) return ctx.need.radius_m * 2.5;
  return best;
}

function fmtM(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Rank all volunteers for a need. Returns sorted candidates (best first). */
export function rankVolunteers(volunteers: Volunteer[], ctx: RankContext): MatchBreakdown[] {
  const eligible = volunteers.filter(
    (v) => v.onboarding_status === "complete" && v.volunteer_id && !v.consent_flags.includes("revoked"),
  );
  const scored = eligible.map((v) => scoreVolunteer(v, ctx));
  scored.sort((a, b) => b.final_score - a.final_score);
  return scored;
}
