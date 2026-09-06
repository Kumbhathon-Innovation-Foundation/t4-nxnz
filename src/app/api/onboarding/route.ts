import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import type { Volunteer } from "@/lib/types";
import { apiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

function maskAadhaar(aadhaar: string): string {
  const digits = (aadhaar || "").replace(/\D/g, "");
  return digits.length === 12 ? `XXXX XXXX ${digits.slice(-4)}` : "";
}

/**
 * POST /api/onboarding — create a new onboarding session (basic info step).
 * Returns volunteer_id which the client uses for subsequent steps.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }

  const name = String(body.name ?? "").trim();
  const dob = String(body.dob ?? "");
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (!name) return apiError(422, "validation_error", "Name is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return apiError(422, "validation_error", "DOB must be YYYY-MM-DD");
  if (phone.length !== 10) return apiError(422, "validation_error", "Phone must be a 10-digit Indian mobile number");

  const now = new Date().toISOString();
  const volunteer_id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const v: Volunteer = {
    volunteer_id,
    created_at: now,
    updated_at: now,
    name,
    dob,
    gender: String(body.gender ?? ""),
    phone,
    email: String(body.email ?? ""),
    city: String(body.city ?? "Nashik"),
    areas_nashik: [],
    kyc_verified: false,
    aadhaar_number_masked: "",
    aadhaar_verified: false,
    police_verification_status: "pending",
    languages: [],
    skills: [],
    interests: [],
    availability: { dates: [], time_slots: [], locations: [] },
    certifications: [],
    transcript_text: "",
    story_media_type: "none",
    extracted_profile: null,
    score_total: 0,
    skill_scores: {},
    score_events: [],
    documents: [],
    onboarding_status: "started",
    consent_flags: ["data_processing_consent"],
  };
  await repo.insert(v);
  return NextResponse.json({ volunteer_id, onboarding_status: v.onboarding_status }, { status: 201 });
}

/** GET /api/onboarding?volunteer_id= — resume session state */
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("volunteer_id");
  if (!id) return apiError(422, "validation_error", "volunteer_id query param required");
  const v = repo.get(id);
  if (!v) return apiError(404, "not_found", "No such onboarding session");
  return NextResponse.json({
    volunteer_id: v.volunteer_id,
    onboarding_status: v.onboarding_status,
    name: v.name,
    kyc_verified: v.kyc_verified,
    aadhaar_verified: v.aadhaar_verified,
    police_verification_status: v.police_verification_status,
    has_story: v.transcript_text.length > 0,
    story_media_type: v.story_media_type,
    languages: v.languages,
    skills: v.skills,
    extracted_profile: v.extracted_profile,
    availability: v.availability,
    interests: v.interests,
    documents_count: v.documents.length,
    certifications_count: v.certifications.length,
  });
}
