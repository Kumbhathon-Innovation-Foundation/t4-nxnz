import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { apiError, publicProfile } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/** POST /api/onboarding/complete — finalize; returns the welcome payload */
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

  if (v.onboarding_status !== "complete") {
    await repo.update(volunteerId, { onboarding_status: "complete" });
  }
  const final = repo.get(volunteerId)!;
  return NextResponse.json({
    volunteer: publicProfile(final),
    volunteer_id: final.volunteer_id,
    name: final.name,
    score_total: final.score_total,
    summary: final.extracted_profile?.summary ?? "",
    skills_count: final.skills.length,
    languages_count: final.languages.length,
    next_steps: [
      "Your profile is now in the SevaSetu volunteer repository.",
      "Partner apps (dispatch, crowd-management) can now discover you by skills, language, and location.",
      "As you volunteer, your Seva Score grows per skill — unlock priority dispatch.",
    ],
  });
}
