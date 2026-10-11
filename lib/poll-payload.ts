import type { McqPollQuestion } from "./types";

const MAX_SHARE_CHARS = 2200;

function toUrlSafe(value: string) {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromUrlSafe(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return padded + "=".repeat((4 - (padded.length % 4 || 4)) % 4);
}

export function encodePollShare(input: {
  title: string;
  questions?: McqPollQuestion[];
}) {
  if (!input.questions?.length) return "";
  const packed = {
    t: input.title,
    q: input.questions.map((row) => [
      row.prompt,
      row.options,
      row.answerIndex,
    ]),
  };
  try {
    const encoded = toUrlSafe(
      btoa(unescape(encodeURIComponent(JSON.stringify(packed)))),
    );
    return encoded.length <= MAX_SHARE_CHARS ? encoded : "";
  } catch {
    return "";
  }
}

export function decodePollShare(raw: string): {
  title: string;
  questions: McqPollQuestion[];
} | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      decodeURIComponent(escape(atob(fromUrlSafe(raw)))),
    ) as { t?: string; q?: unknown };
    if (!Array.isArray(parsed.q)) return null;
    const questions = parsed.q
      .map((row, index) => {
        if (!Array.isArray(row) || row.length < 2) return null;
        const options = Array.isArray(row[1])
          ? row[1].map((item) => String(item))
          : [];
        if (options.length < 2) return null;
        return {
          id: `q_${index + 1}`,
          prompt: String(row[0] || ""),
          options,
          answerIndex: Number(row[2] ?? 0),
        } satisfies McqPollQuestion;
      })
      .filter((row): row is McqPollQuestion => Boolean(row?.prompt));
    if (!questions.length) return null;
    return { title: String(parsed.t || "MCQ poll"), questions };
  } catch {
    return null;
  }
}
