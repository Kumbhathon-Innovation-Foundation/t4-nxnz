import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { requireScope, apiError, publicProfile, fullProfile } from "@/lib/api-utils";
import type { Volunteer } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /v1/volunteers/{id} — public profile; ?full=true needs read:profiles scope */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const wantFull = url.searchParams.get("full") === "true";
  const gate = requireScope(req, wantFull ? "read:profiles" : "read:public");
  if ("response" in gate) return gate.response;

  const v = repo.get(id);
  if (!v) return apiError(404, "not_found", `No volunteer with id ${id}`);
  return NextResponse.json({ volunteer: wantFull ? fullProfile(v) : publicProfile(v) });
}

/** PATCH /v1/volunteers/{id} — edit any field (admin scope) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "admin");
  if ("response" in gate) return gate.response;

  const existing = repo.get(id);
  if (!existing) return apiError(404, "not_found", `No volunteer with id ${id}`);

  try {
    const patch = (await req.json()) as Partial<Volunteer>;
    const forbidden = ["volunteer_id", "created_at", "score_total", "skill_scores", "score_events"] as const;
    for (const f of forbidden) if (f in patch) return apiError(422, "validation_error", `Field ${f} cannot be patched directly`);
    const updated = await repo.update(id, patch);
    return NextResponse.json({ volunteer: fullProfile(updated) });
  } catch (e) {
    return apiError(400, "bad_request", e instanceof Error ? e.message : "Invalid request");
  }
}

/** DELETE /v1/volunteers/{id} — admin only, soft delete via status */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "admin");
  if ("response" in gate) return gate.response;
  const existing = repo.get(id);
  if (!existing) return apiError(404, "not_found", `No volunteer with id ${id}`);
  const updated = await repo.update(id, { onboarding_status: "started", consent_flags: ["revoked"] });
  return NextResponse.json({ volunteer_id: id, status: updated.onboarding_status });
}
