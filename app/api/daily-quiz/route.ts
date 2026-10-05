import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDailyQuiz } from "@/lib/ai-service";
import {
  isAiConfigured,
  mockDailyQuiz,
  parseAiJson,
} from "@/lib/ai";
import { normalizeDailyQuizQuestions } from "@/lib/daily-questions";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import {
  dailyQuizUserPrompt,
  generateSystemPrompt,
  parseStudentSnapshot,
  studentSnapshotSchema,
} from "@/lib/student-context";
import { withScienceCorpus } from "@/lib/science-corpus";

export const maxDuration = 30;

const bodySchema = z.object({
  language: z.enum(["singlish", "english"]).optional(),
  date: z.string().max(32).optional(),
  student: studentSnapshotSchema.optional(),
});

export async function POST(request: Request) {
  if (!allowRequest(`daily-quiz:${clientKey(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const language = parsed.data.language ?? "singlish";
  const date = parsed.data.date || new Date().toISOString().slice(0, 10);
  const snapshot = parseStudentSnapshot(parsed.data.student);
  const fallback = mockDailyQuiz(language, ["Science"]);

  if (!isAiConfigured()) {
    return NextResponse.json({
      date,
      questions: fallback,
      demo: true,
    });
  }

  try {
    const raw = await generateDailyQuiz(
      generateSystemPrompt(language, snapshot),
      withScienceCorpus(
        dailyQuizUserPrompt(snapshot, date, language),
        snapshot.studyFocus[0]?.topic || "Grade 11 Science",
        snapshot.grade,
        "Science",
        1,
      ),
    );
    const parsedQuestions = normalizeDailyQuizQuestions(parseAiJson(raw || ""));
    const questions = parsedQuestions.length ? parsedQuestions : fallback;
    return NextResponse.json({
      date,
      questions: questions.length ? questions : fallback,
      demo: false,
    });
  } catch {
    return NextResponse.json({
      date,
      questions: fallback,
      demo: false,
    });
  }
}
