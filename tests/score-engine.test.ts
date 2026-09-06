import { describe, it, expect } from "vitest";
import {
  multiplierFor, pointsForEvent, certificationBonus, consistencyBonus,
  inactivityDecay, computeScore, makeSessionEvent,
} from "../src/lib/score-engine";
import type { ScoreEvent, Volunteer } from "../src/lib/types";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe("score engine — multipliers", () => {
  it("applies scarce-skill multiplier over category", () => {
    expect(multiplierFor("Lifeguard", "safety")).toBe(1.5);
    expect(multiplierFor("Sign Language", "language")).toBe(2.0);
  });
  it("falls back to category multiplier", () => {
    expect(multiplierFor("unknown skill", "crowd")).toBe(1.2);
    expect(multiplierFor("unknown skill", "logistics")).toBe(1.0);
  });
  it("points per session use base × multiplier", () => {
    expect(pointsForEvent("lifeguard", "safety")).toBe(15); // 10 × 1.5
    expect(pointsForEvent("sign language", "language")).toBe(20); // 10 × 2
  });
});

describe("score engine — certification bonus", () => {
  it("gives 5 points per cert capped at 15 per category", () => {
    const certs = [
      { id: "1", title: "Swim 1", category: "safety", filename: "a.pdf", mimetype: "application/pdf", uploaded_at: "" },
      { id: "2", title: "Swim 2", category: "safety", filename: "b.pdf", mimetype: "application/pdf", uploaded_at: "" },
      { id: "3", title: "Swim 3", category: "safety", filename: "c.pdf", mimetype: "application/pdf", uploaded_at: "" },
      { id: "4", title: "Swim 4", category: "safety", filename: "d.pdf", mimetype: "application/pdf", uploaded_at: "" },
    ] as Volunteer["certifications"];
    const bonus = certificationBonus(certs);
    expect(bonus.total).toBe(15); // capped
    expect(bonus.perCategory["safety"]).toBe(15);
  });
});

describe("score engine — consistency & decay", () => {
  it("awards consistency bonus only at threshold", () => {
    expect(consistencyBonus(2)).toBe(0);
    expect(consistencyBonus(3)).toBe(5);
  });
  it("no decay before threshold, decays after", () => {
    expect(inactivityDecay(100, daysAgo(30)).applied).toBe(false);
    const decayed = inactivityDecay(100, daysAgo(180));
    expect(decayed.applied).toBe(true);
    expect(decayed.decayed).toBe(90); // 5% per 90d, 2 periods
  });
  it("never decays below floor or into negatives", () => {
    expect(inactivityDecay(0, daysAgo(400)).decayed).toBe(0);
  });
});

describe("score engine — full computation", () => {
  it("starts at zero with no events", () => {
    expect(computeScore([]).total).toBe(0);
  });
  it("aggregates per-skill scores from the ledger", () => {
    const events: ScoreEvent[] = [
      { id: "e1", skill: "swimming", points: 15, reason: "volunteering_session", multiplier: 1.5, created_at: daysAgo(1) },
      { id: "e2", skill: "swimming", points: 15, reason: "volunteering_session", multiplier: 1.5, created_at: daysAgo(1) },
      { id: "e3", skill: "swimming", points: 15, reason: "volunteering_session", multiplier: 1.5, created_at: daysAgo(1) },
      { id: "e4", skill: "crowd management", points: 12, reason: "volunteering_session", multiplier: 1.2, created_at: daysAgo(1) },
    ];
    const result = computeScore(events);
    expect(result.skillScores["swimming"]).toBe(50); // 15×3 + 5 consistency bonus
    expect(result.skillScores["crowd management"]).toBe(12);
    expect(result.total).toBe(62);
  });
  it("includes certification bonus in total", () => {
    const events: ScoreEvent[] = [
      { id: "e1", skill: "swimming", points: 15, reason: "volunteering_session", created_at: daysAgo(1) },
    ];
    const certs = [
      { id: "c1", title: "Swim", category: "safety", filename: "a.pdf", mimetype: "application/pdf", uploaded_at: "" },
    ] as Volunteer["certifications"];
    const result = computeScore(events, certs);
    expect(result.skillScores["certification"]).toBe(5);
    expect(result.total).toBe(20);
  });
  it("makeSessionEvent computes multiplier points", () => {
    const ev = makeSessionEvent("sign language", "language");
    expect(ev.points).toBe(20);
    expect(ev.multiplier).toBe(2);
    expect(ev.reason).toBe("volunteering_session");
  });
});
