import { NextRequest, NextResponse } from "next/server";
import { repo } from "@/lib/repository";
import { apiError } from "@/lib/api-utils";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/onboarding/documents — upload supporting certificates (multipart):
 * volunteer_id, files[] (multi). Demo OCR/classification is deterministic offline;
 * real pipeline: Sarvam Vision (mocked here for hackathon demo).
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "bad_request", "Expected multipart/form-data");
  }

  const volunteerId = String(form.get("volunteer_id") ?? "");
  const v = repo.get(volunteerId);
  if (!v) return apiError(404, "not_found", "No such onboarding session");

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return apiError(422, "validation_error", "Attach at least one file");

  const uploadDir = path.join(process.cwd(), "uploads", volunteerId);
  fs.mkdirSync(uploadDir, { recursive: true });

  const saved = [];
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) return apiError(413, "payload_too_large", `File ${file.name} exceeds 10MB`);
    const ext = path.extname(file.name) || ".bin";
    const storedName = `${crypto.randomBytes(8).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(uploadDir, storedName), Buffer.from(await file.arrayBuffer()));

    // Demo "OCR": classify from filename/type. Real: Sarvam Vision on the file.
    const lower = file.name.toLowerCase();
    let title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    let category = "other";
    if (/(swim|aquatic|lifesav)/.test(lower)) { title = "Swimming / Lifesaving Certificate"; category = "safety"; }
    else if (/(first.?aid|red.?cross|cpr|medical|nurs)/.test(lower)) { title = "First Aid / Medical Certificate"; category = "medical"; }
    else if (/(ncc|scout|guide|volunt|seva)/.test(lower)) { title = "Volunteering / Service Certificate"; category = "other"; }
    else if (/(lang|translat|interpret)/.test(lower)) { title = "Language Proficiency Certificate"; category = "language"; }

    saved.push({
      id: `doc_${crypto.randomBytes(4).toString("hex")}`,
      title,
      category,
      filename: storedName,
      original_name: file.name,
      mimetype: file.type || "application/octet-stream",
      uploaded_at: new Date().toISOString(),
    });
  }

  const certifications = [...v.certifications, ...saved.map((s) => ({
    id: s.id, title: s.title, category: s.category, filename: s.filename,
    mimetype: s.mimetype, uploaded_at: s.uploaded_at,
  }))];
  const documents = [...v.documents, ...saved];
  const updated = await repo.update(volunteerId, { certifications, documents });

  return NextResponse.json({
    volunteer_id: volunteerId,
    documents: saved,
    certifications_count: updated.certifications.length,
    note: "Certificates boost your Seva Score once verified. (Demo classification)",
  });
}
