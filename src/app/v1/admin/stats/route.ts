import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { authenticate, apiError } from "@/lib/api-utils";
import { computeDashboardStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** GET /v1/admin/stats — dashboard metrics (admin key only) */
export async function GET(_req: NextRequest) {
  const auth = authenticate(_req);
  if (!auth || auth.kind !== "admin") {
    return apiError(401, "unauthorized", "Admin key required.");
  }
  return NextResponse.json(computeDashboardStats(repo.list()));
}
