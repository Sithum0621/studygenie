import { localStore } from "./local-store";
import type {
  LessonPart,
  LessonProgress,
  StudentLearningState,
  StudyFocus,
  StudyPace,
  StudyTechnique,
} from "./types";

export function partTitlesFromTopics(title: string, topics: string[]) {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const topic of topics) {
    const key = topic.trim().toLowerCase();
    if (!key || key === title.toLowerCase() || seen.has(key)) continue;
    seen.add(key);
    parts.push(topic.trim());
  }
  return parts.length ? parts : [title];
}

function partId(unitId: string, index: number) {
  return `${unitId}-p${index + 1}`;
}

export function emptyLessonProgress(input: {
  unitId: string;
  subject: string;
  title: string;
  topics: string[];
}): LessonProgress {
  const titles = partTitlesFromTopics(input.title, input.topics);
  const now = new Date().toISOString();
  const parts: LessonPart[] = titles.map((title, index) => ({
    id: partId(input.unitId, index),
    title,
    done: false,
    checks: 0,
    correct: 0,
    completedAt: null,
  }));
  return {
    unitId: input.unitId,
    subject: input.subject,
    title: input.title,
    chatId: null,
    parts,
    currentIndex: 0,
    percent: 0,
    pace: "normal",
    technique: "examples",
    avgAnswerMs: 0,
    quizIds: [],
    updatedAt: now,
  };
}

export function loadLessonProgressList() {
  return localStore.getLessonProgress();
}

export function getLessonProgress(unitId: string) {
  return loadLessonProgressList().find((row) => row.unitId === unitId) || null;
}

export function upsertLessonProgress(next: LessonProgress) {
  const rest = loadLessonProgressList().filter(
    (row) => row.unitId !== next.unitId,
  );
  localStore.saveLessonProgress([next, ...rest]);
  return next;
}

export function ensureLessonProgress(input: {
  unitId: string;
  subject: string;
  title: string;
  topics: string[];
}) {
  const existing = getLessonProgress(input.unitId);
  if (existing?.parts.length) return existing;
  return upsertLessonProgress(emptyLessonProgress(input));
}

export function lessonPercent(parts: LessonPart[]) {
  if (!parts.length) return 0;
  const done = parts.filter((part) => part.done).length;
  return Math.round((done / parts.length) * 100);
}

export function isStudentQuestion(text: string) {
  const t = text.trim();
  if (!t) return false;
  if (/^LESSON\s+/i.test(t)) return false;
  if (/[?？]/.test(t)) return true;
  if (t.length > 180) return false;
  return /මොකද|මොනවද|කොහොමද|කියන්නේ|කියන්නෙ|ඇයි|why|how|what|explain|meaning|kiyane|kiyanne|monawad+a|mokada|kohomada|ehenam|\bai\b|koyida|koheda/i.test(
    t,
  );
}

export function guessCheckCorrect(text: string) {
  const t = text.trim();
  if (t.length < 6) return false;
  if (/නැහැ|දන්නේ නැ|no idea|idk|don'?t know/i.test(t)) return false;
  return true;
}

function nextPace(
  avgMs: number,
  correct: boolean,
  current: StudyPace,
): StudyPace {
  if (!correct || avgMs > 45_000) return "slow";
  if (correct && avgMs > 0 && avgMs < 14_000) return "fast";
  if (current === "slow" && correct && avgMs < 25_000) return "normal";
  return current;
}

function nextTechnique(
  pace: StudyPace,
  correct: boolean,
): StudyTechnique {
  if (pace === "slow" || !correct) return "simple";
  if (pace === "fast" && correct) return "exam";
  return "examples";
}

export function applyLessonTurn(
  progress: LessonProgress,
  input: {
    chatId?: string;
    answerMs?: number;
    userText: string;
    kind: "start" | "question" | "answer";
    partDone?: boolean;
    correct?: boolean;
  },
) {
  const parts = progress.parts.map((part) => ({ ...part }));
  const index = Math.min(progress.currentIndex, Math.max(parts.length - 1, 0));
  const current = parts[index];
  let avgMs = progress.avgAnswerMs;
  let pace = progress.pace;
  let technique = progress.technique;

  if (input.kind === "answer" && current && !current.done) {
    const correct = input.correct ?? guessCheckCorrect(input.userText);
    current.checks += 1;
    if (correct) current.correct += 1;
    if (input.answerMs && input.answerMs > 0) {
      avgMs = avgMs
        ? Math.round(avgMs * 0.6 + input.answerMs * 0.4)
        : input.answerMs;
    }
    pace = nextPace(avgMs, correct, pace);
    technique = nextTechnique(pace, correct);
    const shouldClose =
      input.partDone === true ||
      (input.partDone == null && correct && current.checks >= 1);
    if (shouldClose) {
      current.done = true;
      current.completedAt = new Date().toISOString();
    }
  }

  const doneCount = parts.filter((part) => part.done).length;
  const currentIndex =
    doneCount >= parts.length
      ? parts.length - 1
      : parts.findIndex((part) => !part.done);

  return upsertLessonProgress({
    ...progress,
    chatId: input.chatId ?? progress.chatId,
    parts,
    currentIndex: currentIndex < 0 ? 0 : currentIndex,
    percent: lessonPercent(parts),
    pace,
    technique,
    avgAnswerMs: avgMs,
    updatedAt: new Date().toISOString(),
  });
}

export function attachLessonQuiz(unitId: string, quizId: string) {
  const row = getLessonProgress(unitId);
  if (!row || row.quizIds.includes(quizId)) return row;
  return upsertLessonProgress({
    ...row,
    quizIds: [...row.quizIds, quizId],
    updatedAt: new Date().toISOString(),
  });
}

export function lessonFocuses(limit = 6): StudyFocus[] {
  return loadLessonProgressList()
    .filter((row) => row.percent > 0)
    .slice(0, limit)
    .map((row) => {
      const current = row.parts[row.currentIndex] || row.parts[0];
      return {
        subject: row.subject,
        topic: current?.title || row.title,
        level:
          row.pace === "slow"
            ? "confused"
            : row.pace === "fast"
              ? "exam-ready"
              : "some-idea",
      };
    });
}

export function getGuidedLearningState(studentId: string, unitId: string) {
  return (
    localStore
      .getGuidedLearningState()
      .find((row) => row.studentId === studentId && row.unitId === unitId) ||
    null
  );
}

export function upsertGuidedLearningState(next: StudentLearningState) {
  const rest = localStore
    .getGuidedLearningState()
    .filter(
      (row) =>
        !(row.studentId === next.studentId && row.unitId === next.unitId),
    );
  localStore.saveGuidedLearningState([next, ...rest]);
  return next;
}

export function formatLessonForAi(progress: LessonProgress) {
  const lines = progress.parts.map((part, index) => {
    const mark = part.done ? "done" : index === progress.currentIndex ? "NOW" : "todo";
    return `${index + 1}. ${part.title} (${mark})`;
  });
  return [
    `Unit: ${progress.title}`,
    `Progress: ${progress.percent}%`,
    `Current part: ${progress.parts[progress.currentIndex]?.title || progress.title}`,
    `Pace: ${progress.pace}`,
    `Technique: ${progress.technique}`,
    `Parts:`,
    ...lines,
  ].join("\n");
}
