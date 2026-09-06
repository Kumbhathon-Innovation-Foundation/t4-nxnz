import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { requireScope, apiError } from "@/lib/api-utils";
import { computeScore, makeSessionEvent } from "@/lib/score-engine";
import type { ScoreEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /v1/volunteers/{id}/score-events — the score ledger */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "read:public");
  if ("response" in gate) return gate.response;
  const v = repo.get(id);
  if (!v) return apiError(404, "not_found", `No volunteer with id ${id}`);
  return NextResponse.json({ score_total: v.score_total, skill_scores: v.skill_scores, events: v.score_events });
}

/** POST /v1/volunteers/{id}/score-events — record a volunteering event (write:score-events) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "write:score-events");
  if ("response" in gate) return gate.response;
  const v = repo.get(id);
  if (!v) return apiError(404, "not_found", `No volunteer with id ${id}`);

  let body: { skill?: string; category?: string; reason?: string; points?: number };
  try {
    body = await req.json();
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }
  if (!body.skill) return apiError(422, "validation_error", "skill is required");
  const category = body.category ?? "other";
  const reason = body.reason ?? "volunteering_session";

  let event: ScoreEvent;
  if (reason === "volunteering_session") {
    event = makeSessionEvent(body.skill, category);
  } else {
    if (typeof body.points !== "number" || body.points <= 0) {
      return apiError(422, "validation_error", "points (positive number) is required for non-session events");
    }
    event = {
      id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      skill: body.skill,
      points: body.points,
      reason,
      multiplier: 1,
      created_at: new Date().toISOString(),
    };
  }

  const events = [...v.score_events, event];
  const computed = computeScore(events, v.certifications);
  const updated = await repo.update(id, {
    score_events: events,
    score_total: computed.total,
    skill_scores: computed.skillScores,
  });

  return NextResponse.json({
    event,
    score_total: updated.score_total,
    skill_scores: updated.skill_scores,
    breakdown: computed.breakdown.slice(-1),
  }, { status: 201 });
}
