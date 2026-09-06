import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { requireScope, apiError, ADMIN_KEY } from "@/lib/api-utils";
import { hasScope } from "@/lib/api-utils";
import { authenticate } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/** POST /v1/partners — issue a partner API key (admin key protected) */
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth || auth.kind !== "admin") {
    return apiError(401, "unauthorized", "Admin key required to issue partner keys.");
  }
  let body: { name?: string; scopes?: string[] };
  try {
    body = await req.json();
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }
  if (!body.name) return apiError(422, "validation_error", "name is required");

  const VALID = ["read:public", "read:profiles", "search:volunteers", "write:score-events"];
  const scopes = body.scopes?.filter((s) => VALID.includes(s)) ?? ["read:public", "search:volunteers"];
  if (!scopes.length) return apiError(422, "validation_error", `scopes must be non-empty subset of ${VALID.join(", ")}`);

  const partner_id = `p_${Math.random().toString(36).slice(2, 10)}`;
  const api_key = `sk_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  await repo.upsertPartner({ partner_id, name: body.name, api_key, scopes });
  return NextResponse.json({ partner_id, name: body.name, api_key, scopes, note: "Store this key securely; it is shown once." }, { status: 201 });
}

/** GET /v1/partners — list partners (admin only) */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (!auth || auth.kind !== "admin") {
    return apiError(401, "unauthorized", "Admin key required.");
  }
  const partners = repo.listPartners().map((p) => ({
    partner_id: p.partner_id,
    name: p.name,
    scopes: p.scopes,
    created_at: p.created_at,
    revoked: p.revoked,
    api_key_masked: typeof p.api_key === "string" ? `${p.api_key.slice(0, 6)}…` : undefined,
  }));
  return NextResponse.json({ partners });
}
