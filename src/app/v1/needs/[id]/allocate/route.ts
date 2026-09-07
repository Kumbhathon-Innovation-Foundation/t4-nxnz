import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { dispatchStore } from "@/lib/dispatch-store";
import { requireScope, apiError } from "@/lib/api-utils";
import { rankVolunteers, setLocationGazetteer } from "@/lib/dispatch-engine";
import { embed } from "@/lib/ai";
import { NASHIK_GAZETTEER } from "@/lib/gazetteer";
import type { Assignment } from "@/lib/dispatch-types";
import type { SkillCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

setLocationGazetteer(NASHIK_GAZETTEER);

/**
 * POST /v1/needs/{id}/allocate — auto-allocate the best available volunteers.
 * Body: { count?: number } (default: remaining slots). Picks top-ranked
 * available candidates, creates assignments, flips need status.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;
  const need = dispatchStore.getNeed(id);
  if (!need) return apiError(404, "not_found", `No need with id ${id}`);
  if (need.status === "resolved" || need.status === "cancelled") {
    return apiError(409, "need_closed", `Need is ${need.status}`);
  }

  let count = 0;
  try {
    const body = (await req.json()) as { count?: number };
    count = Math.max(0, Math.min(50, body?.count ?? 0));
  } catch { /* empty body ok */ }
  if (!count) {
    const activeCount = dispatchStore.listAssignments(id).filter((a) => a.status !== "no_show").length;
    count = Math.max(0, need.people_needed - activeCount);
  }
  if (!count) return NextResponse.json({ need_id: id, allocated: [], unfilled: 0, note: "Need already fully staffed" });

  const needText = [need.title, need.description, ...need.required_skills, need.category, ...need.languages_required].join(". ");
  const { vector } = await embed(needText);

  const existing = dispatchStore.listAssignments(id);
  const assigned = new Set(existing.map((a) => a.volunteer_id));
  const candidates = rankVolunteers(repo.list(), {
    need,
    needEmbedding: vector,
    volunteerEmbedding: (vid) => repo.getEmbedding(vid),
    activeAssignments: (vid) => dispatchStore.listAssignments().filter((a) => a.volunteer_id === vid && (a.status === "allocated" || a.status === "checked_in")).length,
    alreadyAssigned: assigned,
  });

  const picks = candidates.filter((c) => c.available).slice(0, count);
  const now = new Date().toISOString();
  const allocated: Assignment[] = [];

  for (const pick of picks) {
    const v = repo.get(pick.volunteer_id)!;
    const skill = need.required_skills[0] ?? (need.category as SkillCategory);
    const assignment: Assignment = {
      assignment_id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      need_id: id,
      volunteer_id: v.volunteer_id,
      volunteer_name: v.name,
      status: "allocated",
      match_score: pick.final_score,
      distance_m: pick.distance_m,
      allocated_at: now,
      skill,
      skill_category: need.category,
    };
    await dispatchStore.insertAssignment(assignment);
    allocated.push(assignment);
    assigned.add(v.volunteer_id);
  }

  const totalActive = dispatchStore.listAssignments(id).filter((a) => a.status !== "no_show").length;
  const status = totalActive >= need.people_needed ? "allocated" : "open";
  await dispatchStore.updateNeed(id, { status: need.status === "in_progress" ? "in_progress" : status });

  return NextResponse.json({
    need_id: id,
    allocated,
    unfilled: Math.max(0, need.people_needed - totalActive),
    candidates: candidates.slice(0, 10),
  }, { status: 201 });
}
