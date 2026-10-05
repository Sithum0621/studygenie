import type { ProgressState } from "./types";
import { previousYmd } from "./year";

export function growthSpeed(progress: ProgressState, today: string) {
  const streakPart = Math.min(40, (progress.dailyStreak || 0) * 10);
  const quizPart =
    progress.lastQuizScore != null ? progress.lastQuizScore * 0.4 : 0;
  const dailyPart = progress.dailyQuizDate === today ? 20 : 0;
  return Math.round(Math.min(100, streakPart + quizPart + dailyPart));
}

export function dailyTopic(subjects: string[], dayOfYear: number) {
  const pool = subjects.filter(Boolean);
  const topics = pool.length ? pool : ["Maths", "Science", "English"];
  return topics[dayOfYear % topics.length];
}

export function nextDailyStreak(progress: ProgressState, today: string) {
  if (progress.dailyQuizDate === today) return progress.dailyStreak || 0;
  if (progress.dailyQuizDate === previousYmd(today)) {
    return (progress.dailyStreak || 0) + 1;
  }
  return 1;
}

export function litFires(dailyStreak: number) {
  return Math.min(3, Math.max(0, dailyStreak));
}
