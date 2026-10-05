import { chartSubjects } from "./guide-learning";
import { localStore } from "./local-store";
import { loadPapers } from "./papers";

export type SubjectBarRow = {
  subject: string;
  score: number;
  time: number;
};

const TIME_CAP_MINUTES = 120;

export function matchSubject(text: string, subjects: string[]) {
  const hay = text.toLowerCase();
  return (
    subjects.find((subject) => hay.includes(subject.toLowerCase())) ?? null
  );
}

export function subjectBarRows(profileSubjects: string[]): SubjectBarRow[] {
  const subjects = chartSubjects(profileSubjects);
  const papers = loadPapers().filter(
    (item) => item.kind === "past" || item.kind === "model",
  );
  const attempts = localStore.getPaperAttempts();

  return subjects.map((subject) => {
    const ids = new Set(
      papers.filter((item) => item.subject === subject).map((item) => item.id),
    );
    const latest = new Map<string, (typeof attempts)[number]>();
    let minutes = 0;
    for (const attempt of attempts) {
      if (!ids.has(attempt.paperId)) continue;
      minutes += attempt.timeMinutes;
      const prev = latest.get(attempt.paperId);
      if (!prev || attempt.createdAt > prev.createdAt) {
        latest.set(attempt.paperId, attempt);
      }
    }
    const scores = [...latest.values()].map((item) => item.score);
    const score = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;
    const time = Math.min(100, Math.round((minutes / TIME_CAP_MINUTES) * 100));
    return { subject, score, time };
  });
}
