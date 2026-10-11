import { localStore } from "./local-store";
import type { QuizQuestion } from "./types";

const MAX_SEEN = 80;

export function fingerprintPrompt(prompt: string) {
  return prompt.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 180);
}

export function promptsLookSame(a: string, b: string) {
  const left = fingerprintPrompt(a);
  const right = fingerprintPrompt(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const clip = left.slice(0, 36);
  return (
    (clip.length >= 24 && right.includes(clip)) ||
    (right.slice(0, 36).length >= 24 && left.includes(right.slice(0, 36)))
  );
}

export function dropSeenQuestions<T extends { prompt: string }>(
  items: T[],
  seen: string[],
) {
  const avoided = seen.map(fingerprintPrompt).filter(Boolean);
  return items.filter(
    (item) => !avoided.some((finger) => promptsLookSame(item.prompt, finger)),
  );
}

export function uniqueQuestions<T extends { prompt: string }>(items: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = fingerprintPrompt(item.prompt);
    if (!key || seen.has(key)) continue;
    if (out.some((row) => promptsLookSame(row.prompt, item.prompt))) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function rememberQuestions(questions: QuizQuestion[]) {
  const fresh = questions.map((item) => fingerprintPrompt(item.prompt)).filter(Boolean);
  const next = [...new Set([...fresh, ...localStore.getRecentQuestionFingerprints()])];
  localStore.saveRecentQuestionFingerprints(next.slice(0, MAX_SEEN));
}

export function recentAvoidPrompts(limit = 36) {
  return localStore.getRecentQuestionFingerprints().slice(0, limit);
}
