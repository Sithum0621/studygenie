import { isStudentQuestion } from "@/lib/study-progress";
import type { StudentIntent, TeachingStep } from "./types";

function fold(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const CLARIFY =
  /pahadili|pahadala|thawa tikak|thawa udaharana|another example|explain again|simpler|therenne na|theruna na|therenne naha|confus|example ekak|udaharana|more example|\u0dad\u0dc0 \u0da7\u0dd2\u0d9a|\u0db4\u0dc4\u0daf|\u0d8b\u0daf\u0dcf\u0dc4\u0dbb\u0dab|\u0dad\u0dda\u0dbb\u0dd9\u0db1\u0dca\u0db1\u0dda \u0db1/;

const UNDERSTOOD =
  /theruna|understood|i get it|got it|\bclear\b|\u0dad\u0dda\u0dbb\u0dd4\u0dab|\u0dc4\u0dbb\u0dd2 \u0dc4\u0ddc\u0da3|ok hari|\bhari\b/;

export function classifyStudentIntent(
  message: string,
  kind?: "start" | "question" | "answer",
  step?: TeachingStep,
): StudentIntent {
  const text = fold(message);
  if (kind === "start" || /^lesson\s+/i.test(text)) return "start";
  if (!text) return step === "checkpoint" ? "check_answer" : "start";
  if (CLARIFY.test(text)) return "clarify";
  if (UNDERSTOOD.test(text) && text.length < 80) return "understood";
  if (kind === "question" || isStudentQuestion(message)) return "question";
  return "check_answer";
}

export function isCheckpointCorrect(answer: string, ok: string[]) {
  const text = fold(answer);
  if (!text) return false;
  if (ok.some((token) => text.includes(fold(token)))) return true;
  if (/\b(no|nahae|nahe|naha)\b/.test(text) && ok.some((token) => /නැ|no/i.test(token))) {
    return true;
  }
  if (/^(\u0d94\u0dc0\u0dca|\u0d94\u0dc0\u0dca\u0dba\u0dd2|yes|ow)\b/.test(text) && ok.some((token) => /නැ|no/i.test(token))) {
    return false;
  }
  return false;
}
