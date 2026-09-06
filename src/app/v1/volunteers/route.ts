import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import type { Volunteer } from "@/lib/types";
import { requireScope, apiError, publicProfile } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, "");
  if (digits.length !== 12) return "";
  return `XXXX XXXX ${digits.slice(-4)}`;
}

/** GET /v1/volunteers — filtered search/pagination (search:volunteers scope) */
export async function GET(req: NextRequest) {
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;

  const url = new URL(req.url);
  const skill = url.searchParams.get("skill")?.toLowerCase();
  const language = url.searchParams.get("language")?.toLowerCase();
  const location = url.searchParams.get("location")?.toLowerCase();
  const minScore = Number(url.searchParams.get("min_score") ?? 0);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? 20)));

  let all = repo.list().filter((v) => v.onboarding_status === "complete");
  if (skill) all = all.filter((v) => v.skills.some((s) => s.name.toLowerCase().includes(skill) || s.category === skill));
  if (language) all = all.filter((v) => v.languages.some((l) => l.language.toLowerCase().includes(language)));
  if (location) all = all.filter((v) => v.availability.locations.some((l) => l.toLowerCase().includes(location)));
  all = all.filter((v) => v.score_total >= minScore);
  all.sort((a, b) => b.score_total - a.score_total);

  const total = all.length;
  const start = (page - 1) * pageSize;
  const slice = all.slice(start, start + pageSize);

  return NextResponse.json({
    total, page, page_size: pageSize,
    volunteers: slice.map(publicProfile),
  });
}

/** POST /v1/volunteers — register (admin scope; onboarding app uses internal session flow) */
export async function POST(req: NextRequest) {
  const gate = requireScope(req, "admin");
  if ("response" in gate) return gate.response;
  try {
    const body = (await req.json()) as Partial<Volunteer>;
    if (!body.name || typeof body.name !== "string") return apiError(422, "validation_error", "name is required");
    const now = new Date().toISOString();
    const id = body.volunteer_id ?? `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const v: Volunteer = {
      volunteer_id: id,
      created_at: now,
      updated_at: now,
      name: body.name,
      dob: body.dob ?? "",
      gender: body.gender ?? "",
      phone: body.phone ?? "",
      email: body.email ?? "",
      city: body.city ?? "Nashik",
      areas_nashik: body.areas_nashik ?? [],
      kyc_verified: body.kyc_verified ?? false,
      aadhaar_number_masked: maskAadhaar(body.aadhaar_number_masked ?? ""),
      aadhaar_verified: body.aadhaar_verified ?? false,
      police_verification_status: body.police_verification_status ?? "pending",
      languages: body.languages ?? [],
      skills: body.skills ?? [],
      interests: body.interests ?? [],
      availability: body.availability ?? { dates: [], time_slots: [], locations: [] },
      certifications: body.certifications ?? [],
      transcript_text: body.transcript_text ?? "",
      story_media_type: body.story_media_type ?? "none",
      extracted_profile: body.extracted_profile ?? null,
      score_total: 0,
      skill_scores: {},
      score_events: [],
      documents: body.documents ?? [],
      onboarding_status: body.onboarding_status ?? "started",
      consent_flags: body.consent_flags ?? ["data_processing_consent"],
    };
    await repo.insert(v);
    return NextResponse.json({ volunteer: publicProfile(v), volunteer_id: id }, { status: 201 });
  } catch (e) {
    return apiError(400, "bad_request", e instanceof Error ? e.message : "Invalid request");
  }
}
