import { NextResponse } from "next/server";
import { NASHIK_LOCATIONS, TIME_SLOTS, KUMBH_ROLE_SUGGESTIONS, LANGUAGES } from "@/lib/meta";

export const dynamic = "force-dynamic";

/** GET /v1/meta/skills|languages|locations — reference lists for consuming apps */
export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  switch (resource) {
    case "locations":
      return NextResponse.json({ locations: NASHIK_LOCATIONS });
    case "languages":
      return NextResponse.json({ languages: LANGUAGES });
    case "skills":
      return NextResponse.json({
        roles: KUMBH_ROLE_SUGGESTIONS,
        time_slots: TIME_SLOTS,
        categories: ["safety", "medical", "language", "crowd", "logistics", "technical", "teaching", "other"],
      });
    default:
      return NextResponse.json({ error: { code: "not_found", message: "Unknown meta resource. Use skills, languages or locations." } }, { status: 404 });
  }
}
