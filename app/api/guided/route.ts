import { NextResponse } from "next/server";
import { z } from "zod";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { hasGuidedCatalog, runGuidedTurn } from "@/lib/guided-learning";
import { sanitizeMultiline } from "@/lib/validate";

const bodySchema = z.object({
  studentId: z.string().max(80).default("local"),
  unitId: z.string().max(80),
  message: z.string().max(4000).default(""),
  kind: z.enum(["start", "question", "answer"]).optional(),
  state: z
    .object({
      studentId: z.string().max(80),
      currentTopicId: z.string().max(80),
      step: z.enum(["intro", "explanation", "checkpoint", "completed"]),
      clarificationCount: z.number().int().min(0).max(50),
      lastInteraction: z.string().max(48),
      unitId: z.string().max(80),
      usedAnalogyIndexes: z.array(z.number().int()).max(20),
      completedTopicIds: z.array(z.string().max(80)).max(20),
    })
    .optional(),
});

export async function POST(request: Request) {
  if (!allowRequest(`guided:${clientKey(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!hasGuidedCatalog(parsed.data.unitId)) {
    return NextResponse.json({ error: "No guided catalog" }, { status: 404 });
  }
  const result = runGuidedTurn({
    studentId: parsed.data.studentId,
    unitId: parsed.data.unitId,
    message: sanitizeMultiline(parsed.data.message, 4000),
    kind: parsed.data.kind,
    state: parsed.data.state || null,
  });
  if (!result) {
    return NextResponse.json({ error: "No topic" }, { status: 404 });
  }
  return NextResponse.json({
    reply: result.reply,
    intent: result.intent,
    action: result.action,
    advanced: result.advanced,
    partDone: result.partDone,
    correct: result.correct,
    lessonComplete: result.lessonComplete,
    lockedTopicId: result.lockedTopicId,
    lockedTopicNo: result.lockedTopicNo,
    state: result.state,
    focus: result.focus,
  });
}
