import { NextResponse } from "next/server";
import { z } from "zod";
import {
  completeWithAi,
  isAiConfigured,
  mockFlashcards,
  mockNotes,
  mockPaper,
  mockQuiz,
  parseAiJson,
} from "@/lib/ai";
import {
  contentQuestionsMatchScript,
} from "@/lib/content-language";
import {
  normalizeQuizQuestions,
} from "@/lib/daily-questions";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import {
  generateSystemPrompt,
  generateUserPrompt,
  paperUserPrompt,
  parseStudentSnapshot,
  studentSnapshotSchema,
} from "@/lib/student-context";
import { withScienceCorpus } from "@/lib/science-corpus";
import { sanitizeMultiline, sanitizeText } from "@/lib/validate";

export const maxDuration = 90;

const bodySchema = z.object({
  type: z.enum(["notes", "quiz", "flashcards", "paper"]),
  language: z.enum(["singlish", "english"]).optional(),
  topic: z.string().trim().min(1).max(200),
  sourceText: z.string().max(20_000).optional(),
  student: studentSnapshotSchema.optional(),
  count: z.number().int().min(1).max(20).optional(),
  subject: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  if (!allowRequest(`generate:${clientKey(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const type = parsed.data.type;
  const topic = sanitizeText(parsed.data.topic, 200);
  const sourceText = parsed.data.sourceText
    ? sanitizeMultiline(parsed.data.sourceText, 20_000)
    : undefined;
  const language = parsed.data.language ?? "singlish";
  const snapshot = parseStudentSnapshot(parsed.data.student);
  const demo = !isAiConfigured();
  const system = generateSystemPrompt(language, snapshot);
  const count = parsed.data.count ?? 10;
  const subject = sanitizeText(
    parsed.data.subject || snapshot.subjects[0] || "Science",
    80,
  );

  if (type === "paper") {
    const fallback = mockPaper(topic, count, language, subject);
    if (demo) {
      return NextResponse.json({ questions: fallback, demo: true });
    }
    try {
      const raw = await completeWithAi(
        system,
        withScienceCorpus(
          paperUserPrompt(topic, count, subject, snapshot, language),
          `${subject} ${topic}`,
          snapshot.grade,
          subject,
        ),
        85_000,
      );
      const questions = normalizeQuizQuestions(parseAiJson(raw || ""), count);
      const mixed =
        questions.length &&
        contentQuestionsMatchScript(questions, snapshot.medium, language)
          ? questions
          : fallback;
      return NextResponse.json({
        questions: mixed.map((question) => ({
          ...question,
          subject: question.subject || subject,
        })),
        demo: false,
      });
    } catch {
      return NextResponse.json({ questions: fallback, demo: true });
    }
  }

  const userPrompt = withScienceCorpus(
    generateUserPrompt(type, topic, sourceText, snapshot),
    `${subject} ${topic}`,
    snapshot.grade,
    subject,
  );

  if (demo) {
    if (type === "notes") {
      return NextResponse.json({
        ...mockNotes(topic, sourceText, language),
        demo: true,
      });
    }
    if (type === "quiz") {
      return NextResponse.json({
        questions: mockQuiz(topic, language),
        demo: true,
      });
    }
    return NextResponse.json({
      cards: mockFlashcards(topic, language),
      demo: true,
    });
  }

  try {
    if (type === "notes") {
      const raw = await completeWithAi(system, userPrompt);
      const parsedNotes = parseAiJson(raw || "") as {
        title?: string;
        body?: string;
      } | null;
      return NextResponse.json({
        title: sanitizeText(parsedNotes?.title || topic, 160),
        body: sanitizeMultiline(parsedNotes?.body || raw || "", 20_000),
        demo: false,
      });
    }

    if (type === "quiz") {
      const raw = await completeWithAi(system, userPrompt);
      const parsedQuiz = parseAiJson(raw || "") as { questions?: unknown } | null;
      return NextResponse.json({
        questions: parsedQuiz?.questions || mockQuiz(topic, language),
        demo: false,
      });
    }

    const raw = await completeWithAi(system, userPrompt);
    const parsedCards = parseAiJson(raw || "") as { cards?: unknown } | null;
    return NextResponse.json({
      cards: parsedCards?.cards || mockFlashcards(topic, language),
      demo: false,
    });
  } catch {
    if (type === "notes") {
      return NextResponse.json({
        ...mockNotes(topic, sourceText, language),
        demo: true,
      });
    }
    if (type === "quiz") {
      return NextResponse.json({
        questions: mockQuiz(topic, language),
        demo: true,
      });
    }
    return NextResponse.json({
      cards: mockFlashcards(topic, language),
      demo: true,
    });
  }
}
