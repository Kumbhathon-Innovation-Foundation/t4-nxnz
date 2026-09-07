import { NextRequest, NextResponse } from "next/server";
import { dispatchStore } from "@/lib/dispatch-store";
import { repo } from "@/lib/repository";
import { requireScope, apiError } from "@/lib/api-utils";
import { computeScore, makeSessionEvent } from "@/lib/score-engine";

export const dynamic = "force-dynamic";

/**
 * POST /v1/assignments/{id}/checkout — volunteer completes the shift.
 * Automatically fires a score event: the reward loop that makes Seva Scores grow.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "write:score-events");
  if ("response" in gate) return gate.response;
  const a = dispatchStore.getAssignment(id);
  if (!a) return apiError(404, "not_found", `No assignment with id ${id}`);
  if (a.status !== "checked_in") return apiError(409, "invalid_state", `Assignment is ${a.status}, expected checked_in`);

  const updated = await dispatchStore.updateAssignment(id, { status: "completed", completed_at: new Date().toISOString() });

  const v = repo.get(a.volunteer_id);
  let scoreAwarded = 0;
  let newTotal = v?.score_total ?? 0;
  if (v) {
    const event = makeSessionEvent(a.skill, a.skill_category);
    const events = [...v.score_events, event];
    const computed = computeScore(events, v.certifications);
    await repo.update(a.volunteer_id, { score_events: events, score_total: computed.total, skill_scores: computed.skillScores });
    scoreAwarded = event.points;
    newTotal = computed.total;
  }

  return NextResponse.json({
    assignment: updated,
    score_awarded: scoreAwarded,
    volunteer_score_total: newTotal,
    reward_note: `+${scoreAwarded} Seva Score in "${a.skill}"`,
  });
}
