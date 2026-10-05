import { NextResponse } from "next/server";
import { z } from "zod";
import { polishPollQuestion } from "@/lib/mcq-extract";
import { createPoll, toSummary } from "@/lib/mcq-polls";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validate";

export const maxDuration = 30;

const bodySchema = z.object({
  title: z.string().max(120).optional(),
  fileName: z.string().max(160).optional(),
  questions: z
    .array(
      z.object({
        id: z.string().max(40).optional(),
        prompt: z.string().min(1).max(800),
        options: z.array(z.string().min(1).max(240)).min(2).max(6),
        answerIndex: z.number().int().min(0).max(5).optional(),
      }),
    )
    .min(1)
    .max(25),
});

export async function POST(request: Request) {
  if (!allowRequest(`poll-create:${clientKey(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const questions = parsed.data.questions.map((row, index) =>
    polishPollQuestion({
      id: row.id || `q_${index + 1}`,
      prompt: sanitizeText(row.prompt, 800),
      options: row.options.map((option) => sanitizeText(option, 240)),
      answerIndex:
        row.answerIndex != null && row.answerIndex < row.options.length
          ? row.answerIndex
          : 0,
    }),
  );

  if (questions.some((row) => !row.prompt || row.options.length < 2)) {
    return NextResponse.json({ error: "noQuestions" }, { status: 422 });
  }

  const poll = await createPoll({
    title: sanitizeText(parsed.data.title || "", 120) || "MCQ poll",
    fileName: sanitizeText(parsed.data.fileName || "paper", 160),
    questions,
  });

  return NextResponse.json({
    poll: toSummary(poll),
    questions: poll.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: question.options,
    })),
  });
}
