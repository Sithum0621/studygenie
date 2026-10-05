import type { AppLanguage } from "./copy";
import { localStore } from "./local-store";
import type { StudentSnapshot } from "./student-context";
import { attachLessonQuiz } from "./study-progress";
import type { QuizItem, QuizQuestion } from "./types";

export async function makePartQuiz(input: {
  unitId: string;
  unitTitle: string;
  partTitle: string;
  language: AppLanguage;
  student: StudentSnapshot;
}) {
  const topic = `${input.unitTitle} — ${input.partTitle}`;
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quiz",
        language: input.language,
        topic,
        count: 3,
        subject: "Science",
        student: input.student,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      questions?: QuizQuestion[];
    } | null;
    const questions = data?.questions?.slice(0, 3) || [];
    if (!questions.length) return null;
    const quiz: QuizItem = {
      id: crypto.randomUUID(),
      topic,
      questions,
      score: null,
      createdAt: new Date().toISOString(),
      kind: "practice",
    };
    localStore.saveQuizzes([quiz, ...localStore.getQuizzes()].slice(0, 40));
    attachLessonQuiz(input.unitId, quiz.id);
    return quiz;
  } catch {
    return null;
  }
}
