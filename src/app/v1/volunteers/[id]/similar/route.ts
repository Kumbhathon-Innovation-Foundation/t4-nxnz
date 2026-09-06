import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { requireScope, apiError, publicProfile } from "@/lib/api-utils";
import { cosineSimilarity } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** GET /v1/volunteers/{id}/similar — embedding-based similar volunteers */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;

  const v = repo.get(id);
  if (!v) return apiError(404, "not_found", `No volunteer with id ${id}`);
  const base = repo.getEmbedding(id);
  if (!base) return apiError(404, "no_embedding", "This volunteer has no stored embedding yet.");

  const url = new URL(req.url);
  const topK = Math.min(20, Math.max(1, Number(url.searchParams.get("top_k") ?? 5)));

  const scored = repo
    .list()
    .filter((o) => o.volunteer_id !== id && o.onboarding_status === "complete")
    .map((o) => {
      const vec = repo.getEmbedding(o.volunteer_id);
      return { v: o, sim: vec ? cosineSimilarity(base, vec) : 0 };
    })
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topK);

  return NextResponse.json({
    volunteer_id: id,
    similar: scored.map(({ v, sim }) => ({ ...publicProfile(v), similarity: Number(sim.toFixed(4)) })),
  });
}
