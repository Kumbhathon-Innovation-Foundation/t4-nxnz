import { NextRequest, NextResponse } from "next/server";
import { dispatchStore } from "@/lib/dispatch-store";
import { requireScope, apiError } from "@/lib/api-utils";
import type { Assignment } from "@/lib/dispatch-types";

export const dynamic = "force-dynamic";

/** GET /v1/assignments?active=true — all assignments (dispatch ops view) */
export async function GET(req: NextRequest) {
  const gate = requireScope(req, "read:public");
  if ("response" in gate) return gate.response;
  const url = new URL(req.url);
  const active = url.searchParams.get("active") === "true";
  let assignments = dispatchStore.listAssignments();
  if (active) assignments = assignments.filter((a) => a.status === "allocated" || a.status === "checked_in");
  return NextResponse.json({ assignments });
}

/** POST /v1/assignments — manual assignment (override the engine) */
export async function POST(req: NextRequest) {
  const gate = requireScope(req, "write:score-events");
  if ("response" in gate) return gate.response;
  let body: { need_id?: string; volunteer_id?: string };
  try {
    body = await req.json();
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }
  if (!body.need_id || !body.volunteer_id) return apiError(422, "validation_error", "need_id and volunteer_id required");

  const need = dispatchStore.getNeed(body.need_id);
  if (!need) return apiError(404, "not_found", `No need with id ${body.need_id}`);
  const v = repo!.get(body.volunteer_id);
  if (!v) return apiError(404, "not_found", `No volunteer with id ${body.volunteer_id}`);

  const assignment: Assignment = {
    assignment_id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    need_id: need.need_id,
    volunteer_id: v.volunteer_id,
    volunteer_name: v.name,
    status: "allocated",
    match_score: 1,
    distance_m: 0,
    allocated_at: new Date().toISOString(),
    skill: need.required_skills[0] ?? need.category,
    skill_category: need.category,
  };
  await dispatchStore.insertAssignment(assignment);
  return NextResponse.json({ assignment }, { status: 201 });
}

// repo import placed here to keep the route module clean
import { repo } from "@/lib/repository";
