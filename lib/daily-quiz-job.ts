"use client";

import { buildStudentSnapshot } from "./student-context";
import type { AppLanguage } from "./copy";
import {
  normalizeDailyQuizQuestions,
  quizMatchesAppLanguage,
} from "./daily-questions";
import { localStore } from "./local-store";
import {
  recentAvoidPrompts,
  rememberQuestions,
  uniqueQuestions,
} from "./question-memory";
import { pickScienceMcqs } from "./science-mcq-bank";
import { collectStudyFocuses } from "./study-chats";
import type { DailyQuizSet, Profile } from "./types";
import { msUntilNextLocalMidnight, toYmd } from "./year";

export const DAILY_QUIZ_STYLE = 12;

const listeners = new Set<() => void>();
let inflight: Promise<DailyQuizSet | null> | null = null;
let generating = false;
let waitingOnline = false;
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

export function isDailyQuizWaitingOnline() {
  if (waitingOnline) return true;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return !getCachedDailyQuiz();
  }
  return false;
}

function isNetworkFailure(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof TypeError) return true;
  if (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return true;
  }
  if (error instanceof Error) {
    return /failed to fetch|network|timeout|offline|abort/i.test(error.message);
  }
  return false;
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
  const bank = pickScienceMcqs({
    language,
    medium: medium ?? "sinhala",
    size: 5,
    seed: date,
    avoid: recentAvoidPrompts(),
    topics: collectStudyFocuses().map((row) => row.topic),
  });
  const set: DailyQuizSet = {
    date,
    language,
    medium: medium ?? "sinhala",
    questions: uniqueQuestions(bank).slice(0, 5),
    generatedAt: new Date().toISOString(),
    demo,
    styleVersion: DAILY_QUIZ_STYLE,
  };
  rememberQuestions(set.questions);
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
      purpose: "daily",
      avoidPrompts: recentAvoidPrompts(),
      student: buildStudentSnapshot(user, user?.subjects?.join(" ")),
    }),
  });
  const data = (await res.json()) as {
    questions?: unknown;
    date?: string;
    demo?: boolean;
  };
  const aiQuestions = normalizeDailyQuizQuestions(data.questions);
  const questions = uniqueQuestions(aiQuestions).slice(0, 5);
  if (!questions.length || !quizMatchesAppLanguage(questions, language)) {
    return fallbackSet(date, language, user?.medium, Boolean(data.demo));
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
  rememberQuestions(questions);
  localStore.saveDailyQuizSet(set);
  localStore.saveDailyQuizLock(null);
  return set;
}

export function ensureTodayDailyQuiz(user: Profile | null, language: AppLanguage) {
  const date = toYmd(new Date());
  const cached = getCachedDailyQuiz(date, language);
  if (cached) {
    generating = false;
    waitingOnline = false;
    return Promise.resolve(cached);
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    waitingOnline = true;
    generating = false;
    emit();
    return Promise.resolve(null);
  }
  if (inflight && Date.now() - startedAt < 22_000) return inflight;
  inflight = null;
  generating = false;

  startedAt = Date.now();
  inflight = (async () => {
    generating = true;
    waitingOnline = false;
    emit();
    try {
      localStore.saveDailyQuizLock({
        date,
        startedAt: new Date().toISOString(),
      });
      const next = await pushDailyQuizRequest(user, language, date);
      waitingOnline = false;
      return next;
    } catch (error) {
      localStore.saveDailyQuizLock(null);
      const existing = getCachedDailyQuiz(date, language, user?.medium);
      if (existing) {
        waitingOnline = false;
        return existing;
      }
      if (isNetworkFailure(error)) {
        waitingOnline = true;
        return null;
      }
      waitingOnline = false;
      return fallbackSet(date, language, user?.medium, true);
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
  let midnightTimer = 0;
  const armMidnight = () => {
    window.clearTimeout(midnightTimer);
    midnightTimer = window.setTimeout(() => {
      tick();
      armMidnight();
    }, msUntilNextLocalMidnight());
  };
  armMidnight();
  const onVisible = () => {
    if (document.visibilityState === "visible") tick();
  };
  const onOnline = () => tick();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onOnline);
  window.addEventListener("pageshow", onOnline);
  return () => {
    window.clearInterval(interval);
    window.clearTimeout(midnightTimer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onOnline);
    window.removeEventListener("pageshow", onOnline);
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
