import { localStore } from "./local-store";
import type { StudyTimeState } from "./types";

const TICK_MS = 10_000;
const MAX_DELTA_MIN = 0.5;

function kindForPath(pathname: string): "study" | "waste" | "ignore" {
  if (pathname.startsWith("/class")) return "ignore";
  if (
    pathname.startsWith("/guide") ||
    pathname.startsWith("/quiz") ||
    pathname.startsWith("/notes") ||
    pathname.startsWith("/flashcards") ||
    pathname.startsWith("/tutor") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/papers") ||
    pathname.startsWith("/study") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/game")
  ) {
    return "study";
  }
  if (
    pathname.startsWith("/home") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/bio")
  ) {
    return "waste";
  }
  return "ignore";
}

export function formatStudyMinutes(
  minutes: number,
  hoursAbbrev: string,
  minutesAbbrev: string,
) {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} ${minutesAbbrev}`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (rest === 0) return `${hours}${hoursAbbrev}`;
  return `${hours}${hoursAbbrev} ${rest} ${minutesAbbrev}`;
}

export function setLastStudySubject(subject: string | null) {
  const state = localStore.getStudyTime();
  localStore.saveStudyTime({ ...state, lastStudySubject: subject });
}

function applyTick(pathname: string) {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    return localStore.getStudyTime();
  }
  const kind = kindForPath(pathname);
  const state = localStore.getStudyTime();
  const now = Date.now();
  if (!state.lastTickAt) {
    const next = { ...state, lastTickAt: new Date(now).toISOString() };
    localStore.saveStudyTime(next);
    return next;
  }
  if (kind === "ignore") {
    const next = { ...state, lastTickAt: new Date(now).toISOString() };
    localStore.saveStudyTime(next);
    return next;
  }
  const elapsed = (now - Date.parse(state.lastTickAt)) / 60_000;
  const delta = Math.min(MAX_DELTA_MIN, Math.max(0, elapsed));
  if (delta < 0.08) return state;

  const next: StudyTimeState = {
    ...state,
    lastTickAt: new Date(now).toISOString(),
    studyMinutes: state.studyMinutes,
    wasteMinutes: state.wasteMinutes,
    bySubject: { ...state.bySubject },
  };
  if (kind === "waste") {
    next.wasteMinutes += delta;
  } else {
    next.studyMinutes += delta;
    const subject = state.lastStudySubject;
    if (subject) {
      next.bySubject[subject] = (next.bySubject[subject] || 0) + delta;
    }
  }
  localStore.saveStudyTime(next);
  return next;
}

export function startStudyTimeTracker(pathname: string) {
  applyTick(pathname);
  const timer = window.setInterval(() => applyTick(pathname), TICK_MS);
  const onVis = () => applyTick(pathname);
  document.addEventListener("visibilitychange", onVis);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVis);
  };
}
