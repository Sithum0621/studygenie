import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithTutor } from "@/lib/ai-service";
import {
  isAiConfigured,
  mockStudyReply,
  mockTutorReply,
  parseAiJson,
} from "@/lib/ai";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import {
  buildGuidedUserPrompt,
  GUIDED_TEACHER_SYSTEM_PROMPT,
  hasGuidedCatalog,
  leakedOtherTopic,
  polishTeacherReply,
  runGuidedTurn,
  topicsForUnit,
} from "@/lib/guided-learning";
import { inferStudentTalk, realStudentMessage } from "@/lib/guided-learning/style";
import { formatLessonSourcesForAi } from "@/lib/science-corpus";
import { findSyllabusUnit } from "@/lib/syllabus";
import { isStudentQuestion } from "@/lib/study-progress";
import {
  parseStudentSnapshot,
  studentSnapshotSchema,
  studyChatSystemPrompt,
  tutorSystemPrompt,
  formatStudentSnapshot,
} from "@/lib/student-context";
import { formatLessonForAi } from "@/lib/study-progress";
import { guessStudyFocus } from "@/lib/study-chats";
import type { LessonProgress, StudentLearningState, StudyFocus } from "@/lib/types";
import { withScienceCorpus } from "@/lib/science-corpus";
import { sanitizeMultiline } from "@/lib/validate";

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const lessonSchema = z.object({
  unitId: z.string().max(80),
  title: z.string().max(160),
  parts: z.array(z.string().max(140)).max(16),
  currentIndex: z.number().int().min(0).max(20),
  percent: z.number().min(0).max(100),
  pace: z.enum(["slow", "normal", "fast"]),
  technique: z.enum(["simple", "examples", "exam"]),
  kind: z.enum(["start", "question", "answer"]).optional(),
});

const guidedSchema = z.object({
  studentId: z.string().max(80),
  currentTopicId: z.string().max(80),
  step: z.enum(["intro", "explanation", "checkpoint", "completed"]),
  clarificationCount: z.number().int().min(0).max(50),
  lastInteraction: z.string().max(48),
  unitId: z.string().max(80),
  usedAnalogyIndexes: z.array(z.number().int()).max(20),
  completedTopicIds: z.array(z.string().max(80)).max(20),
});

const bodySchema = z.object({
  language: z.enum(["singlish", "english"]).optional(),
  mode: z.enum(["tutor", "study"]).optional(),
  student: studentSnapshotSchema.optional(),
  messages: z.array(turnSchema).min(1).max(40),
  lesson: lessonSchema.optional(),
  guided: guidedSchema.optional(),
});

function lastUserContent(
  messages: { role: "user" | "assistant"; content: string }[],
) {
  return [...messages].reverse().find((item) => item.role === "user")?.content;
}

function lessonStateText(
  lesson: z.infer<typeof lessonSchema>,
): string {
  const progress = {
    unitId: lesson.unitId,
    subject: "Science",
    title: lesson.title,
    chatId: null,
    parts: lesson.parts.map((title, index) => ({
      id: `${lesson.unitId}-${index}`,
      title,
      done: index < lesson.currentIndex,
      checks: 0,
      correct: 0,
      completedAt: null,
    })),
    currentIndex: lesson.currentIndex,
    percent: lesson.percent,
    pace: lesson.pace,
    technique: lesson.technique,
    avgAnswerMs: 0,
    quizIds: [],
    updatedAt: "",
  } satisfies LessonProgress;
  return `${formatLessonForAi(progress)}\nTurn kind: ${lesson.kind || "start"}`;
}

function parseStudyPayload(
  raw: string | null,
  lastUser: string,
  language: "singlish" | "english",
  subjects: string[],
  history: { role: "user" | "assistant"; content: string }[],
  lesson?: z.infer<typeof lessonSchema>,
): {
  reply: string;
  focus: StudyFocus;
  partDone?: boolean;
  correct?: boolean;
  lessonComplete?: boolean;
} {
  const parsed = raw ? parseAiJson(raw) : null;
  if (parsed && typeof parsed === "object") {
    const row = parsed as {
      reply?: unknown;
      focus?: Partial<StudyFocus>;
      partDone?: unknown;
      correct?: unknown;
      lessonComplete?: unknown;
    };
    const reply = typeof row.reply === "string" ? row.reply.trim() : "";
    const subject =
      typeof row.focus?.subject === "string" ? row.focus.subject : "";
    const topic = typeof row.focus?.topic === "string" ? row.focus.topic : "";
    const level = typeof row.focus?.level === "string" ? row.focus.level : "";
    if (reply) {
      return {
        reply,
        focus:
          subject && topic
            ? { subject, topic, level: level || "confused" }
            : guessStudyFocus(lastUser, subjects),
        partDone: row.partDone === true,
        correct: row.correct === true,
        lessonComplete: row.lessonComplete === true,
      };
    }
  }
  if (raw?.trim() && !raw.trim().startsWith("{")) {
    return { reply: raw.trim(), focus: guessStudyFocus(lastUser, subjects) };
  }
  return mockStudyReply(lastUser, language, undefined, history, lesson);
}

async function guidedStudyReply(input: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  lesson: z.infer<typeof lessonSchema>;
  guided?: StudentLearningState;
  studentId: string;
  studentFacts?: string;
}) {
  const planned = runGuidedTurn({
    studentId: input.studentId,
    unitId: input.lesson.unitId,
    message: input.question,
    kind: input.lesson.kind,
    state: input.guided || null,
    history: input.history,
  });
  if (!planned) return null;

  const talk = inferStudentTalk(input.history, input.question);
  let reply = planned.reply;
  if (isAiConfigured()) {
    try {
      const analogy =
        planned.topic.knowledge.analogies[planned.analogyIndex] ||
        planned.topic.knowledge.analogies[0] ||
        "";
      const history = (
        input.history.filter(
          (turn) =>
            turn.role === "assistant" || Boolean(realStudentMessage(turn.content)),
        ).length
          ? input.history.filter(
              (turn) =>
                turn.role === "assistant" ||
                Boolean(realStudentMessage(turn.content)),
            )
          : [
              {
                role: "user" as const,
                content: talk.last || planned.topic.topicTitle,
              },
            ]
      );
      const raw = await chatWithTutor(
        `${GUIDED_TEACHER_SYSTEM_PROMPT}\n\n${buildGuidedUserPrompt({
          intent: planned.intent,
          action: planned.action,
          state: planned.state,
          topic: planned.topic,
          nextTopic: planned.nextTopic,
          analogy,
          studentMessage: talk.last || input.question,
          talk,
          studentFacts: input.studentFacts,
        })}`,
        history,
      );
      const polished = polishTeacherReply(raw?.trim() || "");
      const lockTopic = planned.topic;
      const others = topicsForUnit(input.lesson.unitId);
      if (
        polished &&
        (planned.action === "advance" ||
          !leakedOtherTopic(polished, lockTopic, others))
      ) {
        reply = polished;
      }
    } catch {
      // Keep the guided lesson reply. Do not surface a key/demo error.
    }
  }

  return {
    reply,
    focus: planned.focus,
    demo: false,
    partDone: planned.partDone,
    correct: planned.advanced ? true : planned.correct === true,
    lessonComplete: planned.lessonComplete,
    guided: planned.state,
  };
}

export async function POST(request: Request) {
  if (!allowRequest(`tutor:${clientKey(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const language = parsed.data.language ?? "singlish";
  const mode = parsed.data.mode ?? "tutor";
  const snapshot = parseStudentSnapshot(parsed.data.student);
  const history = parsed.data.messages
    .map((turn) => ({
      ...turn,
      content: sanitizeMultiline(turn.content, 8000),
    }))
    .filter((turn) => turn.content.trim());
  const question = lastUserContent(history) || "";
  const lesson = parsed.data.lesson;
  const asked =
    lesson?.kind === "question" || isStudentQuestion(question);
  const partQuery = lesson
    ? `${lesson.title} ${lesson.parts[lesson.currentIndex] || ""} ${question}`
    : question;

  if (mode === "study") {
    if (lesson && hasGuidedCatalog(lesson.unitId)) {
      const guided = await guidedStudyReply({
        question,
        history,
        lesson,
        guided: parsed.data.guided,
        studentId: parsed.data.guided?.studentId || snapshot.name || "local",
        studentFacts: formatStudentSnapshot(snapshot),
      });
      if (guided) {
        return NextResponse.json({
          ...guided,
          partDone: asked && !guided.partDone ? false : guided.partDone,
          lessonComplete: asked ? false : guided.lessonComplete,
          correct: asked ? false : guided.correct,
        });
      }
    }
    const lessonText = lesson ? lessonStateText(lesson) : "";
    const unit = lesson ? findSyllabusUnit(lesson.unitId) : null;
    const scope = {
      book: unit?.book,
      pageStart: unit?.pageStart,
      pageEnd: unit?.pageEnd,
    };
    if (!isAiConfigured()) {
      const mock = mockStudyReply(
        question,
        language,
        snapshot,
        history,
        lesson,
      );
      return NextResponse.json({
        ...mock,
        demo: true,
        partDone: asked ? false : undefined,
      });
    }
    try {
      const sources = formatLessonSourcesForAi(partQuery, scope);
      const askBlock = asked
        ? `\n\nSTUDENT QUESTION — guide, don't tell. Use the textbook/guide as private knowledge. Give the related concept in a bite, then exactly one guiding question. Do not dump the final answer. partDone=false.\n${question}`
        : "";
      const raw = await chatWithTutor(
        `${studyChatSystemPrompt(language, snapshot, partQuery, lessonText)}\n\n${sources}${askBlock}`,
        history,
        true,
      );
      const payload = parseStudyPayload(
        raw,
        question,
        language,
        snapshot.subjects,
        history,
        lesson,
      );
      return NextResponse.json({
        ...payload,
        demo: false,
        partDone: asked ? false : payload.partDone,
        lessonComplete: asked ? false : payload.lessonComplete,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 240) : "ai";
      console.error("study tutor", reason);
      const mock = mockStudyReply(
        question,
        language,
        snapshot,
        history,
        lesson,
      );
      return NextResponse.json({
        ...mock,
        demo: false,
        partDone: asked ? false : undefined,
      });
    }
  }

  if (!isAiConfigured()) {
    return NextResponse.json({
      reply: mockTutorReply(question, language, snapshot),
      demo: true,
    });
  }

  try {
    const reply = await chatWithTutor(
      withScienceCorpus(
        tutorSystemPrompt(language, snapshot, question),
        question,
        snapshot.grade,
        snapshot.subjects.join(" "),
      ),
      history,
    );
    return NextResponse.json({
      reply: reply || mockTutorReply(question, language, snapshot),
      demo: false,
    });
  } catch {
    return NextResponse.json({
      reply: mockTutorReply(question, language, snapshot),
      demo: false,
    });
  }
}
