import { NextResponse } from "next/server";
import { z } from "zod";
import { extractPdfText } from "@/lib/pdf-extract";
import { guessSourceKind } from "@/lib/syllabus-rag";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import {
  inspectUpload,
  MAX_UPLOAD_BYTES,
  sanitizeMultiline,
  sanitizeText,
} from "@/lib/validate";

export const maxDuration = 60;

const jsonSchema = z.object({
  text: z.string().min(1).max(80_000),
  title: z.string().max(160).optional(),
  kind: z.enum(["syllabus", "teacher-guide", "notes"]).optional(),
  subject: z.string().max(80).optional(),
});

function looksPdf(bytes: Uint8Array) {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export async function POST(request: Request) {
  if (!allowRequest(`syllabus-ingest:${clientKey(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => null);
    const parsed = jsonSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const title = sanitizeText(parsed.data.title || "Uploaded source", 160);
    return NextResponse.json({
      title,
      kind: parsed.data.kind || guessSourceKind(title),
      subject: sanitizeText(parsed.data.subject || "", 80),
      text: sanitizeMultiline(parsed.data.text, 60_000),
    });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const check = await inspectUpload(file);
  if (!check.ok) {
    return NextResponse.json({ error: "File not allowed" }, { status: 400 });
  }

  const title = sanitizeText(
    String(form?.get("title") || check.fileName),
    160,
  );
  const subject = sanitizeText(String(form?.get("subject") || ""), 80);
  const kindRaw = sanitizeText(String(form?.get("kind") || ""), 40);
  const kind =
    kindRaw === "syllabus" || kindRaw === "teacher-guide" || kindRaw === "notes"
      ? kindRaw
      : guessSourceKind(`${title} ${check.fileName}`);

  if (/\.pdf$/i.test(check.fileName)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksPdf(bytes)) {
      return NextResponse.json({ error: "File not allowed" }, { status: 400 });
    }
    try {
      const text = sanitizeMultiline(await extractPdfText(bytes), 60_000);
      if (text.length < 40) {
        return NextResponse.json({ error: "Empty extract" }, { status: 422 });
      }
      return NextResponse.json({ title, kind, subject, text });
    } catch {
      return NextResponse.json({ error: "PDF extract failed" }, { status: 422 });
    }
  }

  if (/\.(txt|md)$/i.test(check.fileName)) {
    const text = sanitizeMultiline(await file.text(), 60_000);
    if (text.length < 40) {
      return NextResponse.json({ error: "Empty extract" }, { status: 422 });
    }
    return NextResponse.json({ title, kind, subject, text });
  }

  return NextResponse.json(
    { error: "Use PDF, TXT, or MD" },
    { status: 400 },
  );
}
