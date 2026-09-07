import { NextRequest, NextResponse } from "next/server";
import { dispatchStore } from "@/lib/dispatch-store";
import { requireScope, apiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/** POST /v1/assignments/{id}/checkin — volunteer arrives on site */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "write:score-events");
  if ("response" in gate) return gate.response;
  const a = dispatchStore.getAssignment(id);
  if (!a) return apiError(404, "not_found", `No assignment with id ${id}`);
  if (a.status !== "allocated") return apiError(409, "invalid_state", `Assignment is ${a.status}, expected allocated`);
  const updated = await dispatchStore.updateAssignment(id, { status: "checked_in", checked_in_at: new Date().toISOString() });
  await dispatchStore.updateNeed(a.need_id, { status: "in_progress" });
  return NextResponse.json({ assignment: updated });
}
