import type { ScoreEvent, Volunteer } from "./types";
import config from "./score-config.json";

export interface ScoreComputation {
  total: number;
  skillScores: Record<string, number>;
  eventsApplied: number;
  breakdown: Array<{ skill: string; rawPoints: number; multiplier: number; finalPoints: number; reason: string }>;
}

/** Look up the multiplier for a skill from config (scarce skills override category). */
export function multiplierFor(skillName: string, category: string): number {
  const scarce = (config.scarce_skill_multipliers as Record<string, number>)[skillName.toLowerCase()];
  if (scarce) return scarce;
  return (config.category_multipliers as Record<string, number>)[category] ?? 1.0;
}

/** Points for a single volunteering session event, before aggregation. */
export function pointsForEvent(skill: string, category: string, base = config.base_points_per_session): number {
  return Math.round(base * multiplierFor(skill, category));
}

/** Certification bonus: +N per cert, capped per category. */
export function certificationBonus(certs: Volunteer["certifications"]): { total: number; perCategory: Record<string, number> } {
  const perCategory: Record<string, number> = {};
  const maxPerCat = config.certification_bonus.max_per_category;
  const pts = config.certification_bonus.points_per_cert;
  let total = 0;
  for (const cert of certs) {
    const cat = cert.category ?? "other";
    const current = perCategory[cat] ?? 0;
    if (current >= maxPerCat) continue;
    const add = Math.min(pts, maxPerCat - current);
    perCategory[cat] = current + add;
    total += add;
  }
  return { total, perCategory };
}

/** Consistency bonus: volunteers with >= N sessions in a skill get a flat bonus. */
export function consistencyBonus(sessionCount: number): number {
  return sessionCount >= config.consistency_bonus.min_sessions ? config.consistency_bonus.points : 0;
}

/** Inactivity decay: applied on the total, proportional to days since last event. Never below floor. */
export function inactivityDecay(total: number, lastEventAt: string | undefined, now = new Date()): { decayed: number; applied: boolean } {
  if (!lastEventAt || total <= 0) return { decayed: total, applied: false };
  const days = (now.getTime() - new Date(lastEventAt).getTime()) / 86_400_000;
  if (days < config.inactivity_decay.days_threshold) return { decayed: total, applied: false };
  const periods = Math.floor(days / config.inactivity_decay.days_threshold);
  const decayPct = (config.inactivity_decay.decay_percent_per_90d / 100) * periods;
  const decayed = Math.max(config.inactivity_decay.floor, Math.round(total * (1 - Math.min(decayPct, 1))));
  return { decayed, applied: decayed < total };
}

/**
 * Core engine: recompute a volunteer's per-skill and total score from their
 * append-only score event ledger. Pure function — no I/O.
 */
export function computeScore(events: ScoreEvent[], certifications: Volunteer["certifications"] = [], now = new Date()): ScoreComputation {
  const skillScores: Record<string, number> = {};
  const breakdown: ScoreComputation["breakdown"] = [];
  const sessionCounts: Record<string, number> = {};
  let latestAt: string | undefined;

  for (const ev of events) {
    const skill = ev.skill;
    skillScores[skill] = (skillScores[skill] ?? 0) + ev.points;
    if (ev.reason === "volunteering_session") sessionCounts[skill] = (sessionCounts[skill] ?? 0) + 1;
    if (!latestAt || ev.created_at > latestAt) latestAt = ev.created_at;
    breakdown.push({ skill, rawPoints: ev.points, multiplier: ev.multiplier ?? 1, finalPoints: ev.points, reason: ev.reason });
  }

  // consistency bonuses per skill
  for (const [skill, count] of Object.entries(sessionCounts)) {
    const bonus = consistencyBonus(count);
    if (bonus > 0) {
      skillScores[skill] = (skillScores[skill] ?? 0) + bonus;
      breakdown.push({ skill, rawPoints: bonus, multiplier: 1, finalPoints: bonus, reason: "consistency_bonus" });
    }
  }

  // certification bonus (spread onto total, attributed to category "certification")
  const certBonus = certificationBonus(certifications);
  if (certBonus.total > 0) {
    skillScores["certification"] = (skillScores["certification"] ?? 0) + certBonus.total;
    breakdown.push({ skill: "certification", rawPoints: certBonus.total, multiplier: 1, finalPoints: certBonus.total, reason: "certification_bonus" });
  }

  let total = Object.values(skillScores).reduce((a, b) => a + b, 0);
  const decay = inactivityDecay(total, latestAt, now);
  total = decay.decayed;

  return { total, skillScores, eventsApplied: events.length, breakdown };
}

/** Build a new score event for a volunteering session with correct multiplier applied. */
export function makeSessionEvent(skill: string, category: string, now = new Date()): ScoreEvent {
  const multiplier = multiplierFor(skill, category);
  return {
    id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    skill,
    points: Math.round(config.base_points_per_session * multiplier),
    reason: "volunteering_session",
    multiplier,
    created_at: now.toISOString(),
  };
}
