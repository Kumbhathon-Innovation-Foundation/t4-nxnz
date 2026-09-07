import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { dispatchStore } from "@/lib/dispatch-store";
import { requireScope, apiError } from "@/lib/api-utils";
import type { Need } from "@/lib/dispatch-types";

export const dynamic = "force-dynamic";

/** GET /v1/needs/{id} — need detail with assignments */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "read:public");
  if ("response" in gate) return gate.response;
  const need = dispatchStore.getNeed(id);
  if (!need) return apiError(404, "not_found", `No need with id ${id}`);
  const assignments = dispatchStore.listAssignments(id);
  return NextResponse.json({ need, assignments, filled: assignments.filter((a) => a.status !== "no_show").length });
}

/** PATCH /v1/needs/{id} — update status/fields */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;
  const need = dispatchStore.getNeed(id);
  if (!need) return apiError(404, "not_found", `No need with id ${id}`);
  let patch: Partial<Need>;
  try {
    patch = await req.json();
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }
  delete patch.need_id;
  delete patch.created_at;
  if (patch.status === "resolved") patch.resolved_at = new Date().toISOString();
  const updated = await dispatchStore.updateNeed(id, patch);
  return NextResponse.json({ need: updated });
}

/** DELETE /v1/needs/{id} — cancel */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;
  const need = dispatchStore.getNeed(id);
  if (!need) return apiError(404, "not_found", `No need with id ${id}`);
  const updated = await dispatchStore.updateNeed(id, { status: "cancelled", resolved_at: new Date().toISOString() });
  return NextResponse.json({ need: updated });
}
