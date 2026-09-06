import { NextRequest, NextResponse } from "next/server";
import { repo } from "./repository";
import { Volunteer } from "./types";

export const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "sevasetu-admin-key";

export interface AuthContext {
  kind: "partner" | "admin";
  partner_id?: string;
  scopes: string[];
}

export function authenticate(req: NextRequest): AuthContext | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  if (token === ADMIN_KEY) return { kind: "admin", scopes: ["admin"] };
  const partner = repo.getPartnerByKey(token);
  if (partner) return { kind: "partner", partner_id: partner.partner_id, scopes: partner.scopes };
  return null;
}

export function hasScope(auth: AuthContext, scope: string): boolean {
  return auth.kind === "admin" || auth.scopes.includes(scope);
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function requireScope(req: NextRequest, scope: string): { auth: AuthContext } | { response: NextResponse } {
  const auth = authenticate(req);
  if (!auth) return { response: apiError(401, "unauthorized", "Provide a valid partner or admin bearer key.") };
  if (!hasScope(auth, scope)) {
    return { response: apiError(403, "forbidden", `Missing required scope: ${scope}`) };
  }
  return { auth };
}

/** PII-safe public projection — this is what partners with read:public see. */
export function publicProfile(v: Volunteer) {
  return {
    volunteer_id: v.volunteer_id,
    name: v.name,
    city: v.city,
    languages: v.languages.map((l) => ({ language: l.language, proficiency: l.proficiency })),
    skills: v.skills.map((s) => ({ name: s.name, category: s.category, certified: !!s.certified })),
    interests: v.interests,
    availability: v.availability,
    score_total: v.score_total,
    skill_scores: v.skill_scores,
    onboarding_status: v.onboarding_status,
    verification: {
      kyc_verified: v.kyc_verified,
      police_verification_status: v.police_verification_status,
    },
  };
}

/** Full projection (admin / read:profiles scope). */
export function fullProfile(v: Volunteer) {
  return { ...v };
}
