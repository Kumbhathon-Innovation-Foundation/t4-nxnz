import fs from "fs";
import path from "path";
import type { Need, Assignment } from "./dispatch-types";

const DATA_DIR = process.env.DATA_DIR_OVERRIDE ?? path.join(process.cwd(), "data");
const NEEDS_PATH = path.join(DATA_DIR, "needs.json");
const ASSIGNMENTS_PATH = path.join(DATA_DIR, "assignments.json");

function atomicWrite(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, content, "utf-8");
  fs.renameSync(tmp, filePath);
}

function readJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export class DispatchStore {
  private writeQueue: Promise<void> = Promise.resolve();
  private needs: Map<string, Need> = new Map();
  private assignments: Map<string, Assignment> = new Map();

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const n of readJson<Need[]>(NEEDS_PATH, [])) this.needs.set(n.need_id, n);
    for (const a of readJson<Assignment[]>(ASSIGNMENTS_PATH, [])) this.assignments.set(a.assignment_id, a);
  }

  private persist() {
    atomicWrite(NEEDS_PATH, JSON.stringify(Array.from(this.needs.values()), null, 1));
    atomicWrite(ASSIGNMENTS_PATH, JSON.stringify(Array.from(this.assignments.values()), null, 1));
  }

  private enqueueWrite<T>(fn: () => T): Promise<T> {
    const next = this.writeQueue.then(fn) as Promise<T>;
    this.writeQueue = next.then(() => undefined, () => undefined) as Promise<void>;
    return next;
  }

  listNeeds(): Need[] {
    return Array.from(this.needs.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  getNeed(id: string): Need | undefined {
    return this.needs.get(id);
  }

  async insertNeed(n: Need): Promise<void> {
    await this.enqueueWrite(() => {
      this.needs.set(n.need_id, n);
      this.persist();
    });
  }

  async updateNeed(id: string, patch: Partial<Need>): Promise<Need> {
    return this.enqueueWrite(() => {
      const existing = this.needs.get(id);
      if (!existing) throw new Error(`Need not found: ${id}`);
      const updated: Need = { ...existing, ...patch, need_id: existing.need_id, updated_at: new Date().toISOString() };
      this.needs.set(id, updated);
      this.persist();
      return updated;
    });
  }

  listAssignments(needId?: string): Assignment[] {
    const all = Array.from(this.assignments.values());
    const out = needId ? all.filter((a) => a.need_id === needId) : all;
    return out.sort((a, b) => b.allocated_at.localeCompare(a.allocated_at));
  }

  getAssignment(id: string): Assignment | undefined {
    return this.assignments.get(id);
  }

  async insertAssignment(a: Assignment): Promise<void> {
    await this.enqueueWrite(() => {
      this.assignments.set(a.assignment_id, a);
      this.persist();
    });
  }

  async updateAssignment(id: string, patch: Partial<Assignment>): Promise<Assignment> {
    return this.enqueueWrite(() => {
      const existing = this.assignments.get(id);
      if (!existing) throw new Error(`Assignment not found: ${id}`);
      const updated: Assignment = { ...existing, ...patch, assignment_id: existing.assignment_id };
      this.assignments.set(id, updated);
      this.persist();
      return updated;
    });
  }
}

const globalForStore = globalThis as unknown as { __sevasetuDispatch?: DispatchStore };
export const dispatchStore: DispatchStore = globalForStore.__sevasetuDispatch ?? new DispatchStore();
globalForStore.__sevasetuDispatch = dispatchStore;
