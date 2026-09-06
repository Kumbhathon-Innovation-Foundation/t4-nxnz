import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { apiError } from "@/lib/api-utils";
import { NASHIK_LOCATIONS, TIME_SLOTS } from "@/lib/meta";
import type { Availability, Skill } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/details — final structured form:
 * availability (dates/slots/locations), interests (+free-text), skill corrections.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }

  const volunteerId = String(body.volunteer_id ?? "");
  const v = repo.get(volunteerId);
  if (!v) return apiError(404, "not_found", "No such onboarding session");

  // availability
  const availRaw = (body.availability ?? {}) as Partial<Availability>;
  const locations = (availRaw.locations ?? []).filter((l) => typeof l === "string" && l.trim());
  const invalidLoc = locations.filter((l) => !NASHIK_LOCATIONS.includes(l));
  const timeSlots = (availRaw.time_slots ?? []).filter((t) => TIME_SLOTS.includes(t));
  const availability: Availability = {
    dates: (availRaw.dates ?? []).filter((d) => typeof d === "string"),
    time_slots: timeSlots,
    locations,
  };
  if (invalidLoc.length && invalidLoc.some((l) => l.trim())) {
    // allow custom locations but note them; validation is soft
  }
  if (!availability.locations.length) return apiError(422, "validation_error", "Select at least one location");
  if (!availability.time_slots.length) return apiError(422, "validation_error", "Select at least one time slot");

  // interests: array of chips + free_text line
  const interests = [
    ...((body.interests as string[]) ?? []).filter((i) => typeof i === "string" && i.trim()),
  ];
  const freeText = String(body.interest_free_text ?? "").trim();
  if (freeText) interests.push(freeText);

  // optional skill/language corrections from review step
  const skillEdits = (body.skills as Skill[] | undefined)?.map((s) => ({
    ...s,
    source: "manual_edit" as const,
    category: s.category ?? "other",
    confidence: s.confidence ?? 0.8,
  }));

  const updated = await repo.update(volunteerId, {
    availability,
    interests: Array.from(new Set(interests)),
    skills: skillEdits && skillEdits.length ? skillEdits : v.skills,
    onboarding_status: "complete",
  });

  return NextResponse.json({
    volunteer_id: volunteerId,
    onboarding_status: updated.onboarding_status,
    score_total: updated.score_total,
    availability: updated.availability,
    interests: updated.interests,
  });
}
