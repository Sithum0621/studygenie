import type { AppLanguage } from "./copy";
import type { StudentSnapshot } from "./student-context";
import type {
  ChatMessage,
  LessonProgress,
  StudentLearningState,
  StudyFocus,
} from "./types";

export type TutorTurn = {
  role: "user" | "assistant";
  content: string;
};

const WINDOW = 16;

export function toTutorTurns(messages: ChatMessage[]): TutorTurn[] {
  return messages
    .filter((item) => item.content.trim())
    .map((item) => ({ role: item.role, content: item.content }));
}

export type TutorReply = {
  reply: string;
  focus?: StudyFocus;
  demo?: boolean;
  partDone?: boolean;
  correct?: boolean;
  lessonComplete?: boolean;
  guided?: StudentLearningState;
};

export type StudyLessonPayload = {
  unitId: string;
  title: string;
  parts: string[];
  currentIndex: number;
  percent: number;
  pace: LessonProgress["pace"];
  technique: LessonProgress["technique"];
  kind: "start" | "question" | "answer";
};

export function lessonPayload(progress: LessonProgress, kind: StudyLessonPayload["kind"]): StudyLessonPayload {
  return {
    unitId: progress.unitId,
    title: progress.title,
    parts: progress.parts.map((part) => part.title),
    currentIndex: progress.currentIndex,
    percent: progress.percent,
    pace: progress.pace,
    technique: progress.technique,
    kind,
  };
}

export async function postTutorChat(input: {
  mode?: "tutor" | "study";
  language: AppLanguage;
  student: StudentSnapshot;
  messages: ChatMessage[];
  lesson?: StudyLessonPayload;
  guided?: StudentLearningState | null;
}): Promise<TutorReply> {
  try {
    const turns = toTutorTurns(input.messages);
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: input.mode ?? "tutor",
        language: input.language,
        student: input.student,
        messages: turns.slice(-WINDOW),
        lesson: input.lesson,
        guided: input.guided || undefined,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      reply?: string;
      focus?: StudyFocus;
      demo?: boolean;
      partDone?: boolean;
      correct?: boolean;
      lessonComplete?: boolean;
      guided?: StudentLearningState;
    } | null;
    if (!res.ok || !data) {
      return { reply: "" };
    }
    return {
      reply: data.reply || "",
      focus: data.focus,
      demo: data.demo,
      partDone: data.partDone,
      correct: data.correct,
      lessonComplete: data.lessonComplete,
      guided: data.guided,
    };
  } catch {
    return { reply: "" };
  }
}
