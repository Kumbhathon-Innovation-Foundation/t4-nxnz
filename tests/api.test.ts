import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import request from "supertest";
import fs from "fs";
import path from "path";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3111";
const DATA_DIR = path.join(process.cwd(), "data-test");

let server: ChildProcess;
const ADMIN = { Authorization: "Bearer sevasetu-admin-key" };
const PARTNER = { Authorization: "Bearer sk_demo_dispatch_key_2027" };

async function waitForServer(tries = 60): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

beforeAll(async () => {
  if (process.env.TEST_EXTERNAL) return;
  // isolated data dir for tests
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // seed BEFORE the server boots (the repo loads the CSV at process start)
  const { execSync } = await import("child_process");
  execSync("npx tsx scripts/seed.ts", {
    env: { ...process.env, DATA_DIR_OVERRIDE: DATA_DIR, MOCK_AI: "true" },
    stdio: "pipe",
  });
  server = spawn("npx", ["tsx", "tests/server.ts"], {
    env: { ...process.env, PORT: "3111", DATA_DIR_OVERRIDE: DATA_DIR, MOCK_AI: "true" },
    stdio: "pipe",
  });
  const up = await waitForServer();
  if (!up) {
    console.error("server stdout:", server.stdout?.read());
    console.error("server stderr:", server.stderr?.read());
    throw new Error("Test server failed to start");
  }
}, 120_000);

describe("health & meta", () => {
  it("GET /health returns ok with mock_ai", async () => {
    const res = await request(BASE).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.mock_ai).toBe(true);
  });

  it("GET /v1/meta/locations returns Nashik locations", async () => {
    const res = await request(BASE).get("/v1/meta/locations").set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.locations).toContain("Ramkund");
    expect(res.body.locations).toContain("Trimbakeshwar Temple");
  });

  it("GET /v1/meta/unknown returns 404 envelope", async () => {
    const res = await request(BASE).get("/v1/meta/nope").set(PARTNER);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });
});

describe("partner auth", () => {
  it("rejects requests without a key", async () => {
    const res = await request(BASE).get("/v1/volunteers");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("unauthorized");
  });
  it("rejects invalid keys", async () => {
    const res = await request(BASE).get("/v1/volunteers").set({ Authorization: "Bearer sk_wrong" });
    expect(res.status).toBe(401);
  });
  it("admin can issue a scoped partner key", async () => {
    const res = await request(BASE).post("/v1/partners")
      .set(ADMIN)
      .send({ name: "Test Dispatch", scopes: ["read:public", "search:volunteers"] });
    expect(res.status).toBe(201);
    expect(res.body.api_key).toMatch(/^sk_/);
  });
  it("non-admin cannot issue keys", async () => {
    const res = await request(BASE).post("/v1/partners").set(PARTNER).send({ name: "X" });
    expect(res.status).toBe(401);
  });
});

describe("seeded volunteers & search", () => {
  it("lists seeded volunteers with filters", async () => {
    const res = await request(BASE).get("/v1/volunteers?skill=swimming").set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.volunteers[0].skills.some((s: { name: string }) => s.name.includes("swim"))).toBe(true);
  });

  it("filters by language and location", async () => {
    const lang = await request(BASE).get("/v1/volunteers?language=telugu").set(PARTNER);
    expect(lang.body.total).toBeGreaterThanOrEqual(1);
    const loc = await request(BASE).get("/v1/volunteers?location=ramkund").set(PARTNER);
    expect(loc.body.total).toBeGreaterThanOrEqual(1);
  });

  it("semantic search returns ranked volunteers with explanations", async () => {
    const res = await request(BASE).post("/v1/volunteers/search").set(PARTNER)
      .send({ query: "need a lifeguard near the ghats who speaks Marathi", top_k: 3 });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].match_explanation).toBeTruthy();
    // Rahul (swimming coach near Ramkund, Marathi) should appear in top matches
    const top3 = res.body.results.slice(0, 3);
    expect(top3.some((r: { name: string }) => r.name === "Rahul Deshmukh")).toBe(true);
  });

  it("similar volunteers endpoint works", async () => {
    const res = await request(BASE).get("/v1/volunteers/v_seed_rahul/similar").set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.similar.length).toBeGreaterThan(0);
    expect(res.body.similar[0].similarity).toBeGreaterThan(0);
  });

  it("public profile hides PII", async () => {
    const res = await request(BASE).get("/v1/volunteers/v_seed_rahul").set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.volunteer.phone).toBeUndefined();
    expect(res.body.volunteer.aadhaar_number_masked).toBeUndefined();
    expect(res.body.volunteer.name).toBe("Rahul Deshmukh");
  });

  it("full profile requires read:profiles scope", async () => {
    const res = await request(BASE).get("/v1/volunteers/v_seed_rahul?full=true").set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.volunteer.phone).toBeTruthy();
  });

  it("404 for unknown volunteer", async () => {
    const res = await request(BASE).get("/v1/volunteers/v_ghost").set(PARTNER);
    expect(res.status).toBe(404);
  });
});

describe("score engine via API", () => {
  it("POST score-event for lifeguard session applies multiplier", async () => {
    const res = await request(BASE).post("/v1/volunteers/v_seed_rahul/score-events").set(PARTNER)
      .send({ skill: "swimming", category: "safety", reason: "volunteering_session" });
    expect(res.status).toBe(201);
    expect(res.body.event.points).toBe(15); // 10 × 1.5 scarce
    expect(res.body.score_total).toBeGreaterThan(0);
    expect(res.body.skill_scores["swimming"]).toBeGreaterThanOrEqual(15);
  });

  it("PATCH cannot touch score fields directly", async () => {
    const res = await request(BASE).patch("/v1/volunteers/v_seed_rahul").set(ADMIN)
      .send({ score_total: 9999 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("validation_error");
  });

  it("PATCH can edit interests (admin)", async () => {
    const res = await request(BASE).patch("/v1/volunteers/v_seed_rahul").set(ADMIN)
      .send({ interests: ["Lifeguard", "River safety educator"] });
    expect(res.status).toBe(200);
    expect(res.body.volunteer.interests).toContain("River safety educator");
  });
});

describe("onboarding golden path (mock AI)", () => {
  let vid = "";

  it("step 1: signup validates and creates session", async () => {
    const bad = await request(BASE).post("/api/onboarding").send({ name: "", dob: "1990-01-01", phone: "9999999999" });
    expect(bad.status).toBe(422);

    const badPhone = await request(BASE).post("/api/onboarding").send({ name: "Test", dob: "1990-01-01", phone: "123" });
    expect(badPhone.status).toBe(422);

    const res = await request(BASE).post("/api/onboarding")
      .send({ name: "Demo Volunteer", dob: "1996-05-14", gender: "female", phone: "9822012345", email: "demo@example.com" });
    expect(res.status).toBe(201);
    vid = res.body.volunteer_id;
    expect(vid).toMatch(/^v_/);
  });

  it("step 2-3: identity endpoint verifies demo KYC", async () => {
    const bad = await request(BASE).post("/api/onboarding/identity").send({ volunteer_id: vid, aadhaar_number: "123" });
    expect(bad.status).toBe(422);

    const res = await request(BASE).post("/api/onboarding/identity")
      .send({ volunteer_id: vid, aadhaar_number: "123456789012" });
    expect(res.status).toBe(200);
    expect(res.body.kyc_verified).toBe(true);
    expect(res.body.aadhaar_number_masked).toBe("XXXX XXXX 9012");
    expect(res.body.police_verification_status).toBe("clear");
  });

  it("step 4: story pipeline (typed transcript, mock extraction)", async () => {
    const res = await request(BASE).post("/api/onboarding/story")
      .field("volunteer_id", vid)
      .field("transcript", "Namaste, I am Sunita. I speak fluent Marathi and Hindi and basic English. I am a nurse with first aid training and I know swimming. I am free evenings near Trimbakeshwar Temple. Once I helped a pilgrim who fainted.");
    expect(res.status).toBe(200);
    expect(res.body.transcript).toContain("Sunita");
    expect(res.body.profile.skills.length).toBeGreaterThan(0);
    expect(res.body.languages.length).toBeGreaterThan(0);
  });

  it("step 4 rejects empty story request", async () => {
    const res = await request(BASE).post("/api/onboarding/story").field("volunteer_id", vid);
    expect(res.status).toBe(422);
  });

  it("step 5: document upload classifies certificates", async () => {
    const res = await request(BASE).post("/api/onboarding/documents")
      .field("volunteer_id", vid)
      .attach("files", Buffer.from("%PDF-1.4 fake first aid cert"), { filename: "first-aid-cert.pdf", contentType: "application/pdf" })
      .attach("files", Buffer.from("%PDF-1.4 fake swim cert"), { filename: "swimming-cert.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(200);
    expect(res.body.documents.length).toBe(2);
    const titles = res.body.documents.map((d: { title: string }) => d.title);
    expect(titles.some((t: string) => t.includes("First Aid"))).toBe(true);
    expect(titles.some((t: string) => t.includes("Swimming"))).toBe(true);
  });

  it("step 7: details validation and completion", async () => {
    const bad = await request(BASE).post("/api/onboarding/details")
      .send({ volunteer_id: vid, availability: { time_slots: ["Morning (8-12)"], locations: [] } });
    expect(bad.status).toBe(422);

    const res = await request(BASE).post("/api/onboarding/details")
      .send({
        volunteer_id: vid,
        availability: { dates: ["2027-08-01"], time_slots: ["Evening (16-20)"], locations: ["Trimbakeshwar Temple", "Ramkund"] },
        interests: ["First-aid support"],
        interest_free_text: "Can guide Telugu-speaking pilgrims",
      });
    expect(res.status).toBe(200);
    expect(res.body.onboarding_status).toBe("complete");
    expect(res.body.interests).toContain("Can guide Telugu-speaking pilgrims");
  });

  it("step 8: completion returns ID card payload", async () => {
    const res = await request(BASE).post("/api/onboarding/complete").send({ volunteer_id: vid });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Demo Volunteer");
    expect(res.body.volunteer_id).toBe(vid);
    expect(res.body.score_total).toBe(0);
  });

  it("new volunteer is discoverable via API search", async () => {
    const res = await request(BASE).post("/v1/volunteers/search").set(PARTNER)
      .send({ query: "nurse with first aid skills free in the evening" });
    expect(res.status).toBe(200);
    const found = res.body.results.find((r: { volunteer_id: string }) => r.volunteer_id === vid);
    expect(found).toBeTruthy();
  });
});

describe("consistency & integrity", () => {
  it("CSV is valid and contains seeded + new volunteers", async () => {
    const csvPath = path.join(DATA_DIR, "volunteers.csv");
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, "utf-8");
      const lines = content.trim().split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(6); // header + 5 seeds + demo
      expect(lines[0]).toContain("volunteer_id");
    }
  });
});

afterAll(async () => {
  if (server && !process.env.TEST_EXTERNAL) {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }
});
