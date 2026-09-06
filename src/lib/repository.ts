import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import fs from "fs";
import path from "path";
import { Volunteer } from "./types";

const DATA_DIR = process.env.DATA_DIR_OVERRIDE ?? path.join(process.cwd(), "data");
const CSV_PATH = path.join(DATA_DIR, "volunteers.csv");
const EMBEDDINGS_PATH = path.join(DATA_DIR, "embeddings.json");
const PARTNERS_PATH = path.join(DATA_DIR, "partners.json");

const CSV_COLUMNS = [
  "volunteer_id", "created_at", "updated_at", "name", "dob", "gender", "phone", "email",
  "city", "areas_nashik", "kyc_verified", "aadhaar_number_masked", "aadhaar_verified",
  "police_verification_status", "languages", "skills", "interests", "availability",
  "certifications", "transcript_text", "story_media_type", "extracted_profile",
  "score_total", "skill_scores", "score_events", "documents", "onboarding_status", "consent_flags",
];

type CsvRow = Record<string, string>;

function serializeJsonFields(v: Volunteer): CsvRow {
  return {
    volunteer_id: v.volunteer_id,
    created_at: v.created_at,
    updated_at: v.updated_at,
    name: v.name,
    dob: v.dob,
    gender: v.gender,
    phone: v.phone,
    email: v.email,
    city: v.city,
    areas_nashik: JSON.stringify(v.areas_nashik),
    kyc_verified: String(v.kyc_verified),
    aadhaar_number_masked: v.aadhaar_number_masked,
    aadhaar_verified: String(v.aadhaar_verified),
    police_verification_status: v.police_verification_status,
    languages: JSON.stringify(v.languages),
    skills: JSON.stringify(v.skills),
    interests: JSON.stringify(v.interests),
    availability: JSON.stringify(v.availability),
    certifications: JSON.stringify(v.certifications),
    transcript_text: v.transcript_text,
    story_media_type: v.story_media_type,
    extracted_profile: v.extracted_profile ? JSON.stringify(v.extracted_profile) : "",
    score_total: String(v.score_total),
    skill_scores: JSON.stringify(v.skill_scores),
    score_events: JSON.stringify(v.score_events),
    documents: JSON.stringify(v.documents),
    onboarding_status: v.onboarding_status,
    consent_flags: JSON.stringify(v.consent_flags),
  };
}

function deserializeRow(row: CsvRow): Volunteer {
  const safeParse = <T>(s: string, fallback: T): T => {
    try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
  };
  return {
    volunteer_id: row.volunteer_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: row.name ?? "",
    dob: row.dob ?? "",
    gender: row.gender ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    city: row.city ?? "",
    areas_nashik: safeParse<string[]>(row.areas_nashik, []),
    kyc_verified: row.kyc_verified === "true",
    aadhaar_number_masked: row.aadhaar_number_masked ?? "",
    aadhaar_verified: row.aadhaar_verified === "true",
    police_verification_status: (row.police_verification_status as Volunteer["police_verification_status"]) ?? "pending",
    languages: safeParse(row.languages, []),
    skills: safeParse(row.skills, []),
    interests: safeParse(row.interests, []),
    availability: safeParse(row.availability, { dates: [], time_slots: [], locations: [] }),
    certifications: safeParse(row.certifications, []),
    transcript_text: row.transcript_text ?? "",
    story_media_type: (row.story_media_type as Volunteer["story_media_type"]) ?? "none",
    extracted_profile: row.extracted_profile ? safeParse(row.extracted_profile, null) : null,
    score_total: Number(row.score_total) || 0,
    skill_scores: safeParse<Record<string, number>>(row.skill_scores, {}),
    score_events: safeParse(row.score_events, []),
    documents: safeParse(row.documents, []),
    onboarding_status: (row.onboarding_status as Volunteer["onboarding_status"]) ?? "started",
    consent_flags: safeParse<string[]>(row.consent_flags, []),
  };
}

/** Atomic write: write temp file then rename, so a crash never corrupts the CSV. */
function atomicWrite(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, content, "utf-8");
  fs.renameSync(tmp, filePath);
}

export class VolunteerRepository {
  private rows: Map<string, Volunteer> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.load();
  }

  private load() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(CSV_PATH)) {
      const content = fs.readFileSync(CSV_PATH, "utf-8");
      const records: CsvRow[] = parse(content, { columns: true, skip_empty_lines: true, bom: true });
      for (const row of records) {
        const v = deserializeRow(row);
        this.rows.set(v.volunteer_id, v);
      }
    }
    if (fs.existsSync(EMBEDDINGS_PATH)) {
      const obj = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, "utf-8")) as Record<string, number[]>;
      for (const [id, vec] of Object.entries(obj)) this.embeddings.set(id, vec);
    }
  }

  /** Serialize all mutations through one queue to avoid interleaved writes. */
  private enqueueWrite<T>(fn: () => T): Promise<T> {
    const next = this.writeQueue.then(fn) as Promise<T>;
    this.writeQueue = next.then(() => undefined, () => undefined) as Promise<void>;
    return next;
  }

  private persist() {
    const records = Array.from(this.rows.values()).map(serializeJsonFields);
    atomicWrite(CSV_PATH, stringify(records, { columns: CSV_COLUMNS, header: true }));
    const embObj: Record<string, number[]> = {};
    for (const [id, vec] of this.embeddings.entries()) embObj[id] = vec;
    atomicWrite(EMBEDDINGS_PATH, JSON.stringify(embObj));
  }

  // ---- reads (synchronous, in-memory) ----
  list(): Volunteer[] {
    return Array.from(this.rows.values());
  }

  get(id: string): Volunteer | undefined {
    return this.rows.get(id);
  }

  getEmbedding(id: string): number[] | undefined {
    return this.embeddings.get(id);
  }

  // ---- writes ----
  async insert(v: Volunteer, embedding?: number[]): Promise<void> {
    await this.enqueueWrite(() => {
      if (this.rows.has(v.volunteer_id)) throw new Error(`Duplicate volunteer_id: ${v.volunteer_id}`);
      this.rows.set(v.volunteer_id, v);
      if (embedding) this.embeddings.set(v.volunteer_id, embedding);
      this.persist();
    });
  }

  async update(id: string, patch: Partial<Volunteer>, embedding?: number[]): Promise<Volunteer> {
    return this.enqueueWrite((): Volunteer => {
      const existing = this.rows.get(id);
      if (!existing) throw new Error(`Volunteer not found: ${id}`);
      const updated: Volunteer = { ...existing, ...patch, volunteer_id: existing.volunteer_id, updated_at: new Date().toISOString() };
      this.rows.set(id, updated);
      if (embedding) this.embeddings.set(id, embedding);
      this.persist();
      return updated;
    });
  }

  async upsertPartner(p: { partner_id: string; name: string; api_key: string; scopes: string[]; revoked?: boolean }) {
    const partnersPath = PARTNERS_PATH;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    let partners: Array<Record<string, unknown>> = [];
    if (fs.existsSync(partnersPath)) {
      try { partners = JSON.parse(fs.readFileSync(partnersPath, "utf-8")); } catch { partners = []; }
    }
    const idx = partners.findIndex((p2) => p2.partner_id === p.partner_id);
    const record = { ...p, created_at: new Date().toISOString(), revoked: p.revoked ?? false };
    if (idx >= 0) partners[idx] = { ...partners[idx], ...record };
    else partners.push(record);
    atomicWrite(partnersPath, JSON.stringify(partners, null, 2));
  }

  getPartnerByKey(apiKey: string): { partner_id: string; name: string; scopes: string[] } | undefined {
    if (!fs.existsSync(PARTNERS_PATH)) return undefined;
    try {
      const partners = JSON.parse(fs.readFileSync(PARTNERS_PATH, "utf-8")) as Array<{
        api_key: string; partner_id: string; name: string; scopes: string[]; revoked: boolean;
      }>;
      const p = partners.find((x) => x.api_key === apiKey && !x.revoked);
      if (!p) return undefined;
      return { partner_id: p.partner_id, name: p.name, scopes: p.scopes };
    } catch {
      return undefined;
    }
  }

  getPartnerById(partnerId: string) {
    if (!fs.existsSync(PARTNERS_PATH)) return undefined;
    try {
      const partners = JSON.parse(fs.readFileSync(PARTNERS_PATH, "utf-8")) as Array<Record<string, unknown>>;
      return partners.find((x) => x.partner_id === partnerId);
    } catch {
      return undefined;
    }
  }

  listPartners() {
    if (!fs.existsSync(PARTNERS_PATH)) return [];
    try {
      return JSON.parse(fs.readFileSync(PARTNERS_PATH, "utf-8")) as Array<Record<string, unknown>>;
    } catch {
      return [];
    }
  }
}

// Singleton per process
const globalForRepo = globalThis as unknown as { __sevasetuRepo?: VolunteerRepository };
export const repo: VolunteerRepository = globalForRepo.__sevasetuRepo ?? new VolunteerRepository();
globalForRepo.__sevasetuRepo = repo;
