import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { dispatchStore } from "@/lib/dispatch-store";
import { requireScope, apiError } from "@/lib/api-utils";
import { rankVolunteers, setLocationGazetteer } from "@/lib/dispatch-engine";
import { embed } from "@/lib/ai";
import { NASHIK_GAZETTEER } from "@/lib/gazetteer";
import type { Need } from "@/lib/dispatch-types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

setLocationGazetteer(NASHIK_GAZETTEER);

/**
 * POST /v1/needs/{id}/match — rank volunteers for this need.
 * Body: { top_k?: number }. Uses the semantic embedding of the need text +
 * skill/score/proximity/language scoring. Read-only preview.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;
  const need = dispatchStore.getNeed(id);
  if (!need) return apiError(404, "not_found", `No need with id ${id}`);

  let topK = 10;
  try {
    const body = (await req.json()) as { top_k?: number };
    topK = Math.min(50, Math.max(1, body?.top_k ?? 10));
  } catch { /* empty body ok */ }

  const needText = [need.title, need.description, ...need.required_skills, need.category, ...need.languages_required].join(". ");
  const { vector } = await embed(needText);

  const assigned = new Set(dispatchStore.listAssignments(id).map((a) => a.volunteer_id));
  const candidates = rankVolunteers(repo.list(), {
    need,
    needEmbedding: vector,
    volunteerEmbedding: (vid) => repo.getEmbedding(vid),
    activeAssignments: (vid) => dispatchStore.listAssignments().filter((a) => a.volunteer_id === vid && (a.status === "allocated" || a.status === "checked_in")).length,
    alreadyAssigned: assigned,
  });

  return NextResponse.json({
    need_id: id,
    people_needed: need.people_needed,
    filled: assigned.size,
    candidates: candidates.slice(0, topK),
  });
}
