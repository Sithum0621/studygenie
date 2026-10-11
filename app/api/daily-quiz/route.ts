import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDailyQuiz } from "@/lib/ai-service";
import {
  isAiConfigured,
  parseAiJson,
} from "@/lib/ai";
import { normalizeQuizQuestions } from "@/lib/daily-questions";
import {
  dropSeenQuestions,
  uniqueQuestions,
} from "@/lib/question-memory";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { pickScienceMcqs } from "@/lib/science-mcq-bank";
import {
  dailyQuizUserPrompt,
  gameQuizUserPrompt,
  generateSystemPrompt,
  parseStudentSnapshot,
  studentSnapshotSchema,
} from "@/lib/student-context";
import { withScienceCorpus } from "@/lib/science-corpus";

export const maxDuration = 30;

const bodySchema = z.object({
  language: z.enum(["singlish", "english"]).optional(),
  date: z.string().max(32).optional(),
  purpose: z.enum(["daily", "game"]).optional(),
  avoidPrompts: z.array(z.string().max(200)).max(40).optional(),
  roundId: z.string().max(80).optional(),
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
  const purpose = parsed.data.purpose ?? "daily";
  const avoidPrompts = parsed.data.avoidPrompts ?? [];
  const snapshot = parseStudentSnapshot(parsed.data.student);
  const topics = [
    ...snapshot.studyFocus.map((row) => row.topic),
    ...(snapshot.learnedLessons || []).flatMap((row) => [
      row.current,
      row.title,
    ]),
  ];
  const size = purpose === "game" ? 8 : 5;
  const fallback = pickScienceMcqs({
    language,
    medium: snapshot.medium,
    size,
    seed: `${purpose}-${date}-${parsed.data.roundId || topics[0] || "science"}`,
    avoid: avoidPrompts,
    topics,
  });

  if (!isAiConfigured()) {
    return NextResponse.json({
      date,
      questions: fallback,
      demo: true,
    });
  }

  try {
    const userPrompt =
      purpose === "game"
        ? gameQuizUserPrompt(
            snapshot,
            language,
            avoidPrompts,
            parsed.data.roundId || date,
          )
        : dailyQuizUserPrompt(snapshot, date, language, avoidPrompts);
    const raw = await generateDailyQuiz(
      generateSystemPrompt(language, snapshot),
      withScienceCorpus(
        userPrompt,
        snapshot.studyFocus[0]?.topic ||
          snapshot.learnedLessons?.[0]?.current ||
          "Grade 11 Science",
        snapshot.grade,
        "Science",
        1,
      ),
    );
    const parsedQuestions = uniqueQuestions(
      dropSeenQuestions(
        normalizeQuizQuestions(parseAiJson(raw || ""), size),
        avoidPrompts,
      ),
    );
    const questions = uniqueQuestions(
      parsedQuestions.length >= (purpose === "game" ? 6 : 3)
        ? parsedQuestions
        : [...parsedQuestions, ...fallback],
    ).slice(0, size);
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
