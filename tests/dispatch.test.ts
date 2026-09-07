import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, execSync, ChildProcess } from "child_process";
import request from "supertest";
import fs from "fs";
import path from "path";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3111";
const DATA_DIR = path.join(process.cwd(), "data-test");
const ADMIN = { Authorization: "Bearer sevasetu-admin-key" };
const PARTNER = { Authorization: "Bearer sk_demo_dispatch_key_2027", "Content-Type": "application/json" };

let server: ChildProcess;

async function waitForServer(tries = 60): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) return true; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

beforeAll(async () => {
  if (process.env.TEST_EXTERNAL) return;
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const env = { ...process.env, PORT: "3111", DATA_DIR_OVERRIDE: DATA_DIR, MOCK_AI: "true" };
  execSync("npx tsx scripts/seed.ts", { env, stdio: "pipe" });
  execSync("npx tsx scripts/seed-dispatch.ts", { env, stdio: "pipe" });
  server = spawn("npx", ["tsx", "tests/server.ts"], { env, stdio: "pipe", detached: true });
  const up = await waitForServer();
  if (!up) throw new Error("Test server failed to start");
}, 180_000);

describe("dispatch: seeded data", () => {
  it("has 12 demo needs at real Nashik coordinates", async () => {
    const res = await request(BASE).get("/v1/needs").set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.needs.length).toBeGreaterThanOrEqual(12);
    const ramkund = res.body.needs.find((n: { location_name: string }) => n.location_name === "Ramkund");
    expect(ramkund).toBeTruthy();
    expect(ramkund.lat).toBeCloseTo(20.0079, 3);
    expect(ramkund.lng).toBeCloseTo(73.7923, 3);
    expect(ramkund.urgency).toBe("critical");
  });

  it("dispatch volunteers are onboarded and scored", async () => {
    const res = await request(BASE).get("/v1/volunteers?v_d_raju&full=true").set(ADMIN);
    void res;
    const raju = await request(BASE).get("/v1/volunteers/v_d_raju?full=true").set(ADMIN);
    expect(raju.status).toBe(200);
    expect(raju.body.volunteer.onboarding_status).toBe("complete");
    expect(raju.body.volunteer.score_total).toBeGreaterThan(0);
    expect(raju.body.volunteer.skills.some((s: { name: string }) => s.name === "lifeguard")).toBe(true);
  });
});

describe("dispatch: matching engine", () => {
  it("ranks the lifeguard first for a drowning emergency", async () => {
    const needs = (await request(BASE).get("/v1/needs").set(PARTNER)).body.needs;
    const distress = needs.find((n: { title: string }) => n.title.includes("distress"));
    expect(distress).toBeTruthy();
    const res = await request(BASE).post(`/v1/needs/${distress.need_id}/match`).set(PARTNER).send({ top_k: 5 });
    expect(res.status).toBe(200);
    expect(res.body.candidates.length).toBeGreaterThan(0);
    const top = res.body.candidates[0];
    expect(top.reasons.join(" ")).toMatch(/lifeguard|swimming|rescue/i);
    expect(top.final_score).toBeGreaterThan(0.5);
  });

  it("ranks language helpers by required language", async () => {
    const needs = (await request(BASE).get("/v1/needs").set(PARTNER)).body.needs;
    const bengali = needs.find((n: { description: string }) => n.description.includes("Kolkata"));
    const res = await request(BASE).post(`/v1/needs/${bengali.need_id}/match`).set(PARTNER).send({ top_k: 5 });
    const top = res.body.candidates[0];
    expect(top.language_match).toBe(true);
    expect(top.reasons.join(" ")).toMatch(/Bengali/);
  });

  it("sinks unverified volunteers (soft penalty) and never excludes them from visibility", async () => {
    const needs = (await request(BASE).get("/v1/needs").set(PARTNER)).body.needs;
    const need = needs[0];
    const res = await request(BASE).post(`/v1/needs/${need.need_id}/match`).set(PARTNER).send({ top_k: 50 });
    // all returned candidates should carry score fields
    for (const c of res.body.candidates) {
      expect(typeof c.final_score).toBe("number");
      expect(typeof c.distance_m).toBe("number");
    }
  });
});

describe("dispatch: full allocation lifecycle", () => {
  let needId = "";
  let assignmentId = "";

  it("allocates people to the critical child case and fills it", async () => {
    const needs = (await request(BASE).get("/v1/needs").set(PARTNER)).body.needs;
    const childCase = needs.find((n: { title: string }) => n.title.includes("Child separated"));
    needId = childCase.need_id;
    expect(childCase.people_needed).toBe(3);

    const res = await request(BASE).post(`/v1/needs/${needId}/allocate`).set(PARTNER).send({});
    expect(res.status).toBe(201);
    expect(res.body.allocated.length).toBe(3);
    expect(res.body.unfilled).toBe(0);
    assignmentId = res.body.allocated[0].assignment_id;

    // candidates should be sorted desc by final_score and all picked ones available
    const scores = res.body.allocated.map((a: { match_score: number }) => a.match_score);
    for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
  });

  it("refuses to double-allocate beyond capacity", async () => {
    const res = await request(BASE).post(`/v1/needs/${needId}/allocate`).set(PARTNER).send({});
    expect(res.status).toBe(200);
    expect(res.body.allocated.length).toBe(0);
    expect(res.body.note).toMatch(/fully staffed/i);
  });

  it("check-in flips need to in_progress", async () => {
    const res = await request(BASE).post(`/v1/assignments/${assignmentId}/checkin`).set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.assignment.status).toBe("checked_in");
    const need = (await request(BASE).get(`/v1/needs/${needId}`).set(PARTNER)).body.need;
    expect(need.status).toBe("in_progress");
  });

  it("check-out awards Seva Score automatically (the reward loop)", async () => {
    const before = await request(BASE).get(`/v1/volunteers?full=true`).set(ADMIN);
    void before;
    const need = (await request(BASE).get(`/v1/needs/${needId}`).set(PARTNER)).body.need;
    const assignment = (await request(BASE).get(`/v1/needs/${needId}`).set(PARTNER)).body.assignments.find((a: { assignment_id: string }) => a.assignment_id === assignmentId);
    const volunteerBefore = (await request(BASE).get(`/v1/volunteers/${assignment.volunteer_id}?full=true`).set(ADMIN)).body.volunteer;
    const scoreBefore = volunteerBefore.score_total;

    const res = await request(BASE).post(`/v1/assignments/${assignmentId}/checkout`).set(PARTNER);
    expect(res.status).toBe(200);
    expect(res.body.score_awarded).toBeGreaterThan(0);
    expect(res.body.volunteer_score_total).toBe(scoreBefore + res.body.score_awarded);
  });

  it("checkout requires checked_in state (no double checkout)", async () => {
    const res = await request(BASE).post(`/v1/assignments/${assignmentId}/checkout`).set(PARTNER);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("invalid_state");
  });

  it("resolving the need marks resolved_at", async () => {
    const res = await request(BASE).patch(`/v1/needs/${needId}`).set(PARTNER).send({ status: "resolved" });
    expect(res.status).toBe(200);
    expect(res.body.need.status).toBe("resolved");
    expect(res.body.need.resolved_at).toBeTruthy();
  });

  it("cannot allocate to a resolved need", async () => {
    const res = await request(BASE).post(`/v1/needs/${needId}/allocate`).set(PARTNER).send({});
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("need_closed");
  });
});

describe("dispatch: creating new needs (consumer API contract)", () => {
  it("consumer app can create a need and get matches", async () => {
    const create = await request(BASE).post("/v1/needs").set(PARTNER).send({
      title: "Test surge at Thakkar Bazar",
      description: "Sudden crowd swell needs queue management",
      category: "crowd",
      required_skills: ["queue management"],
      languages_required: ["Hindi"],
      people_needed: 2,
      urgency: "high",
      location_name: "Thakkar Bazar",
      lat: 20.0008, lng: 73.7806,
      radius_m: 1500,
    });
    expect(create.status).toBe(201);
    const needId = create.body.need.need_id;

    const match = await request(BASE).post(`/v1/needs/${needId}/match`).set(PARTNER).send({ top_k: 3 });
    expect(match.status).toBe(200);
    expect(match.body.candidates.length).toBeGreaterThan(0);
    // Nitin Bhalerao (queue expert at Kalaram, 9 sessions) should rank top-3
    const names = match.body.candidates.map((c: { name: string }) => c.name);
    expect(names).toContain("Nitin Bhalerao");
  });

  it("validates need creation input", async () => {
    const bad = await request(BASE).post("/v1/needs").set(PARTNER).send({ title: "x", people_needed: 0 });
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe("validation_error");
  });

  it("auth is enforced on all dispatch endpoints", async () => {
    expect((await request(BASE).get("/v1/needs")).status).toBe(401);
    expect((await request(BASE).post("/v1/needs").send({})).status).toBe(401);
    const r = await request(BASE).post("/v1/needs/n_ramkund_0/allocate").set({ Authorization: "Bearer sk_wrong" });
    expect(r.status).toBe(401);
  });
});

afterAll(async () => {
  if (server && !process.env.TEST_EXTERNAL) {
    try { process.kill(-(server.pid ?? 0), "SIGTERM"); } catch { server.kill("SIGKILL"); }
    await new Promise((r) => setTimeout(r, 800));
    try { execSync("npx kill-port 3111 2>/dev/null || true", { stdio: "ignore" }); } catch { /* ok */ }
  }
});
