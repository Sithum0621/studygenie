import { loadPapers } from "./papers";
import { localStore } from "./local-store";
import { toYmd } from "./year";

export type PaperPlay = {
  subject: string;
  score: number;
  date: string;
};

export type StudentActivity = {
  dailyQuizDoneToday: boolean;
  dailyStreak: number;
  gameSessions7d: number;
  lastGameScore: number | null;
  lastGameAt: string | null;
  pastPapers: PaperPlay[];
  modelPapers: PaperPlay[];
  studyMinutes: number;
  wasteMinutes: number;
  nextExam: string | null;
};

function daysAgo(iso: string) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 999;
  return (Date.now() - then) / 86_400_000;
}

function nextExamDate() {
  const today = toYmd(new Date());
  const upcoming = localStore
    .getYearEvents()
    .filter((item) => /exam/i.test(item.title) && item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0]?.date ?? null;
}

export function collectStudentActivity(date = toYmd(new Date())): StudentActivity {
  const progress = localStore.getProgress();
  const games = localStore.getGameSessions();
  const recentGames = games.filter((item) => daysAgo(item.createdAt) <= 7);
  const papers = loadPapers();
  const byId = new Map(papers.map((item) => [item.id, item]));
  const past: PaperPlay[] = [];
  const model: PaperPlay[] = [];
  for (const attempt of localStore.getPaperAttempts().slice(0, 12)) {
    const paper = byId.get(attempt.paperId);
    if (!paper || paper.kind === "own") continue;
    const row = {
      subject: paper.subject,
      score: attempt.score,
      date: attempt.createdAt.slice(0, 10),
    };
    if (paper.kind === "past") past.push(row);
    if (paper.kind === "model") model.push(row);
  }
  const time = localStore.getStudyTime();
  return {
    dailyQuizDoneToday: progress.dailyQuizDate === date,
    dailyStreak: progress.dailyStreak || 0,
    gameSessions7d: recentGames.length,
    lastGameScore: games[0]?.score ?? null,
    lastGameAt: games[0]?.createdAt.slice(0, 10) ?? null,
    pastPapers: past.slice(0, 5),
    modelPapers: model.slice(0, 5),
    studyMinutes: Math.round(time.studyMinutes),
    wasteMinutes: Math.round(time.wasteMinutes),
    nextExam: nextExamDate(),
  };
}

export function formatStudentActivity(activity: StudentActivity) {
  const games = activity.gameSessions7d
    ? `${activity.gameSessions7d} game rounds in 7 days` +
      (activity.lastGameScore != null
        ? `, last score ${activity.lastGameScore}% (${activity.lastGameAt})`
        : "")
    : "no game rounds in 7 days";
  const past = activity.pastPapers.length
    ? activity.pastPapers
        .map((row) => `${row.subject} ${row.score}% (${row.date})`)
        .join("; ")
    : "none yet";
  const model = activity.modelPapers.length
    ? activity.modelPapers
        .map((row) => `${row.subject} ${row.score}% (${row.date})`)
        .join("; ")
    : "none yet";
  return [
    `Daily Quiz today: ${activity.dailyQuizDoneToday ? "already done" : "not done yet"}`,
    `Daily streak: ${activity.dailyStreak}`,
    `Games: ${games}`,
    `Past papers recently: ${past}`,
    `Model papers recently: ${model}`,
    `Study minutes logged: ${activity.studyMinutes}; wasted minutes: ${activity.wasteMinutes}`,
    `Next exam date: ${activity.nextExam || "not set on year bar"}`,
  ].join("\n");
}
