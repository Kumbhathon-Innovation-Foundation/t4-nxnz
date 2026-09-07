import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { dispatchStore } from "@/lib/dispatch-store";
import { requireScope, apiError } from "@/lib/api-utils";
import { rankVolunteers, setLocationGazetteer } from "@/lib/dispatch-engine";
import { embed } from "@/lib/ai";
import type { Need } from "@/lib/dispatch-types";
import type { SkillCategory } from "@/lib/types";
import { NASHIK_GAZETTEER } from "@/lib/gazetteer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

setLocationGazetteer(NASHIK_GAZETTEER);

const CATEGORIES: SkillCategory[] = ["safety", "medical", "language", "crowd", "logistics", "technical", "teaching", "other"];

/** GET /v1/needs — list needs with their assignments */
export async function GET(req: NextRequest) {
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  let needs = dispatchStore.listNeeds();
  if (status) needs = needs.filter((n) => n.status === status);
  return NextResponse.json({
    needs: needs.map((n) => ({
      ...n,
      assignments: dispatchStore.listAssignments(n.need_id),
      filled: dispatchStore.listAssignments(n.need_id).filter((a) => a.status !== "no_show").length,
    })),
  });
}

/** POST /v1/needs — create a need (dispatch apps) */
export async function POST(req: NextRequest) {
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;
  let body: Partial<Need>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }

  const errors: string[] = [];
  if (!body.title?.trim()) errors.push("title required");
  if (!body.category || !CATEGORIES.includes(body.category)) errors.push(`category must be one of ${CATEGORIES.join(", ")}`);
  if (typeof body.lat !== "number" || typeof body.lng !== "number") errors.push("lat/lng numbers required");
  if (!body.people_needed || body.people_needed < 1) errors.push("people_needed >= 1 required");
  if (errors.length) return apiError(422, "validation_error", errors.join("; "));

  const now = new Date().toISOString();
  const need: Need = {
    need_id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: body.title!,
    description: body.description ?? "",
    category: body.category!,
    required_skills: body.required_skills ?? [],
    languages_required: body.languages_required ?? [],
    min_score: body.min_score ?? 0,
    people_needed: body.people_needed!,
    urgency: body.urgency ?? "medium",
    location_name: body.location_name ?? "Nashik",
    lat: body.lat!,
    lng: body.lng!,
    radius_m: body.radius_m ?? 3000,
    time_window: body.time_window ?? { start: "06:00", end: "22:00" },
    status: "open",
    created_at: now,
    updated_at: now,
    source: body.source ?? "dispatch-app",
  };
  await dispatchStore.insertNeed(need);
  return NextResponse.json({ need }, { status: 201 });
}
