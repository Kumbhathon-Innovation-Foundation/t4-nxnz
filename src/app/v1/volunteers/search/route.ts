import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { requireScope, apiError, publicProfile } from "@/lib/api-utils";
import { embed, cosineSimilarity, profileEmbeddingText } from "@/lib/ai";

export const dynamic = "force-dynamic";

interface SearchBody {
  query: string;
  filters?: {
    skill?: string;
    language?: string;
    location?: string;
    min_score?: number;
  };
  top_k?: number;
}

/** POST /v1/volunteers/search — semantic search over the volunteer repository */
export async function POST(req: NextRequest) {
  const gate = requireScope(req, "search:volunteers");
  if ("response" in gate) return gate.response;

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return apiError(400, "bad_request", "Invalid JSON body");
  }
  if (!body.query || typeof body.query !== "string") {
    return apiError(422, "validation_error", "query is required");
  }
  const topK = Math.min(50, Math.max(1, body.top_k ?? 10));
  const f = body.filters ?? {};

  const { vector: queryVec } = await embed(body.query);

  const candidates = repo.list().filter((v) => {
    if (v.onboarding_status !== "complete") return false;
    if (f.skill && !v.skills.some((s) => s.name.toLowerCase().includes(f.skill!.toLowerCase()) || s.category === f.skill)) return false;
    if (f.language && !v.languages.some((l) => l.language.toLowerCase().includes(f.language!.toLowerCase()))) return false;
    if (f.location && !v.availability.locations.some((l) => l.toLowerCase().includes(f.location!.toLowerCase()))) return false;
    if (f.min_score !== undefined && v.score_total < f.min_score) return false;
    return true;
  });

  const scored = candidates.map((v) => {
    const stored = repo.getEmbedding(v.volunteer_id);
    const sim = stored ? cosineSimilarity(queryVec, stored) : 0;
    // Hybrid rank: similarity dominates, score gives a small boost.
    const scoreBoost = Math.min(0.1, v.score_total / 1000);
    const rank = sim + scoreBoost;
    return { v, sim, rank };
  });
  scored.sort((a, b) => b.rank - a.rank);

  return NextResponse.json({
    query: body.query,
    results: scored.slice(0, topK).map(({ v, sim }) => ({
      ...publicProfile(v),
      match_score: Number(sim.toFixed(4)),
      match_explanation: buildExplanation(v),
    })),
  });
}

function buildExplanation(v: import("@/lib/types").Volunteer): string {
  const langs = v.languages.filter((l) => l.proficiency === "fluent" || l.proficiency === "native").map((l) => l.language);
  const skills = v.skills.slice(0, 3).map((s) => s.name + (s.certified ? " (certified)" : ""));
  const times = v.availability.time_slots.slice(0, 2).join(", ");
  const parts = [
    langs.length ? `speaks ${langs.join(" + ")}` : null,
    skills.length ? `skilled in ${skills.join(", ")}` : null,
    times ? `available ${times}` : null,
    v.availability.locations.length ? `at ${v.availability.locations.slice(0, 2).join(", ")}` : null,
  ].filter(Boolean);
  return parts.join("; ") || v.extracted_profile?.summary || "Profile match";
}
