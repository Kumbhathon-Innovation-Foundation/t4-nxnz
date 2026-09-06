import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/** Serves the OpenAPI spec as JSON for Swagger UI / Postman import. */
export async function GET() {
  const specPath = path.join(process.cwd(), "openapi.yaml");
  if (!fs.existsSync(specPath)) {
    return NextResponse.json({ error: { code: "not_found", message: "openapi.yaml missing" } }, { status: 404 });
  }
  return new NextResponse(fs.readFileSync(specPath, "utf-8"), {
    headers: { "Content-Type": "application/yaml" },
  });
}
