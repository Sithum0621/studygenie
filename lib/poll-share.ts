import { localStore } from "./local-store";
import type { McqPollSummary } from "./types";

const listeners = new Set<() => void>();

export function onTeacherPollsChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitTeacherPolls() {
  listeners.forEach((listener) => listener());
}

export function pollShareUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/p/${code}`;
}

export function whatsappShareHref(url: string, title: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
}

export function saveTeacherPoll(poll: McqPollSummary) {
  const next = [
    poll,
    ...localStore.getMcqPolls().filter((row) => row.id !== poll.id),
  ];
  localStore.saveMcqPolls(next);
  emitTeacherPolls();
  return next;
}

export function deleteTeacherPoll(id: string) {
  const next = localStore.getMcqPolls().filter((row) => row.id !== id);
  localStore.saveMcqPolls(next);
  emitTeacherPolls();
  return next;
}

export function latestTeacherPolls(items: McqPollSummary[]) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
}
