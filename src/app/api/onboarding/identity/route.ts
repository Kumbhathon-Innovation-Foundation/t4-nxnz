import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { apiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/identity — demo KYC/Aadhaar + police verification placeholders.
 * Simulates verification latency and always clears (demo mode).
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

  const aadhaar = String(body.aadhaar_number ?? "").replace(/\D/g, "");
  if (aadhaar.length !== 12) return apiError(422, "validation_error", "Aadhaar must be 12 digits (demo)");

  // Simulated latency for realistic demo UX
  await new Promise((r) => setTimeout(r, 1500));

  const updated = await repo.update(volunteerId, {
    aadhaar_number_masked: `XXXX XXXX ${aadhaar.slice(-4)}`,
    aadhaar_verified: true,
    kyc_verified: true,
    police_verification_status: "clear", // placeholder: real integration later; demo never rejects
    onboarding_status: v.onboarding_status === "started" ? "identity_pending" : v.onboarding_status,
    consent_flags: Array.from(new Set([...v.consent_flags, "kyc_demo_consent"])),
  });

  return NextResponse.json({
    volunteer_id: volunteerId,
    aadhaar_verified: updated.aadhaar_verified,
    kyc_verified: updated.kyc_verified,
    aadhaar_number_masked: updated.aadhaar_number_masked,
    police_verification_status: updated.police_verification_status,
    note: "Demo mode: KYC/Aadhaar/police verification are simulated placeholders.",
  });
}
