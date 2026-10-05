"use client";

import { buildStudentSnapshot } from "./student-context";
import type { AppLanguage } from "./copy";
import {
  normalizeDailyQuizQuestions,
  quizMatchesAppLanguage,
  scienceDailyFallback,
} from "./daily-questions";
import { localStore } from "./local-store";
import type { DailyQuizSet, Profile } from "./types";
import { toYmd } from "./year";

export const DAILY_QUIZ_STYLE = 9;

const listeners = new Set<() => void>();
let inflight: Promise<DailyQuizSet | null> | null = null;
let generating = false;
let startedAt = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

export function getCachedDailyQuiz(
  date = toYmd(new Date()),
  language?: AppLanguage,
  medium?: Profile["medium"],
): DailyQuizSet | null {
  const set = localStore.getDailyQuizSet();
  if (!set || set.date !== date || set.questions.length === 0) return null;
  if ((set.styleVersion || 0) < DAILY_QUIZ_STYLE) return null;
  if (language && set.language && set.language !== language) return null;
  if (language && !quizMatchesAppLanguage(set.questions, language)) return null;
  return set;
}

export function isDailyQuizGenerating() {
  return generating;
}

export function onDailyQuizChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fallbackSet(
  date: string,
  language: AppLanguage,
  medium: Profile["medium"] | undefined,
  demo = true,
): DailyQuizSet {
  const existing = getCachedDailyQuiz(date, language);
  if (existing) return existing;
  const set: DailyQuizSet = {
    date,
    language,
    medium: medium ?? "sinhala",
    questions: scienceDailyFallback(language),
    generatedAt: new Date().toISOString(),
    demo,
    styleVersion: DAILY_QUIZ_STYLE,
  };
  localStore.saveDailyQuizSet(set);
  localStore.saveDailyQuizLock(null);
  return set;
}

async function pushDailyQuizRequest(
  user: Profile | null,
  language: AppLanguage,
  date: string,
): Promise<DailyQuizSet | null> {
  const res = await fetch("/api/daily-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      language,
      date,
      student: buildStudentSnapshot(user, user?.subjects?.join(" ")),
    }),
  });
  const data = (await res.json()) as {
    questions?: unknown;
    date?: string;
    demo?: boolean;
  };
  const questions = normalizeDailyQuizQuestions(data.questions);
  if (!questions.length || !quizMatchesAppLanguage(questions, language)) {
    return fallbackSet(date, language, user?.medium);
  }
  const set: DailyQuizSet = {
    date: data.date || date,
    language,
    medium: user?.medium ?? "sinhala",
    questions,
    generatedAt: new Date().toISOString(),
    demo: Boolean(data.demo),
    styleVersion: DAILY_QUIZ_STYLE,
  };
  localStore.saveDailyQuizSet(set);
  localStore.saveDailyQuizLock(null);
  return set;
}

export function ensureTodayDailyQuiz(user: Profile | null, language: AppLanguage) {
  const date = toYmd(new Date());
  const cached = getCachedDailyQuiz(date, language);
  if (cached) {
    generating = false;
    return Promise.resolve(cached);
  }
  if (inflight && Date.now() - startedAt < 22_000) return inflight;
  inflight = null;
  generating = false;

  startedAt = Date.now();
  inflight = (async () => {
    generating = true;
    emit();
    try {
      localStore.saveDailyQuizLock({
        date,
        startedAt: new Date().toISOString(),
      });
      return await pushDailyQuizRequest(user, language, date);
    } catch {
      localStore.saveDailyQuizLock(null);
      return (
        getCachedDailyQuiz(date, language, user?.medium) ||
        fallbackSet(date, language, user?.medium)
      );
    } finally {
      generating = false;
      inflight = null;
      emit();
    }
  })();

  return inflight;
}

export function startDailyQuizBackgroundJob(
  user: Profile | null,
  language: AppLanguage,
) {
  const tick = () => {
    void ensureTodayDailyQuiz(user, language);
  };
  tick();
  const interval = window.setInterval(tick, 60_000);
  const onVisible = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function refreshDailyQuizFromStudy(
  user: Profile | null,
  language: AppLanguage,
) {
  const date = toYmd(new Date());
  const attempt = localStore.getDailyQuizAttempt();
  if (attempt?.date === date) return;
  localStore.saveDailyQuizSet(null);
  inflight = null;
  generating = false;
  void ensureTodayDailyQuiz(user, language);
}
