import { NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { mockMode } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const volunteers = repo.list().filter((v) => v.onboarding_status === "complete").length;
  return NextResponse.json({
    status: "ok",
    service: "sevasetu",
    version: "v1",
    mock_ai: mockMode(),
    volunteers_registered: volunteers,
    time: new Date().toISOString(),
  });
}
