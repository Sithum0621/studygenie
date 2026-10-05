import { NextResponse } from "next/server";
import { extractMcqFromFile } from "@/lib/mcq-extract";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { inspectPollUpload, pollMimeForName } from "@/lib/validate";

export const maxDuration = 90;

export async function POST(request: Request) {
  if (!allowRequest(`poll-extract:${clientKey(request)}`, 12, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  const check = await inspectPollUpload(file);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracted = await extractMcqFromFile({
    bytes,
    fileName: check.fileName,
    mime: pollMimeForName(check.fileName),
  });
  if (!extracted.questions.length) {
    console.error("poll extract empty", check.fileName);
    return NextResponse.json({ error: "noQuestions" }, { status: 422 });
  }

  return NextResponse.json({
    title: extracted.title,
    fileName: check.fileName,
    questions: extracted.questions,
  });
}
