import { extractMcqsFromText, transcribePaper } from "./ai-service";
import { isAiConfigured, parseAiJson } from "./ai";
import { extractPdfText } from "./pdf-extract";
import { sanitizeMultiline, sanitizeText } from "./validate";
import type { McqPollQuestion } from "./types";

function asList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const row = raw as Record<string, unknown>;
  for (const key of ["questions", "mcqs", "items", "data", "paper"]) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
  }
  return [];
}

function optionsFromRow(row: Record<string, unknown>): string[] {
  const fromArray = (value: unknown) =>
    Array.isArray(value)
      ? value.map((item) => sanitizeText(String(item), 240)).filter(Boolean)
      : [];

  for (const value of [row.options, row.choices, row.answers, row.optionList]) {
    const list = fromArray(value);
    if (list.length >= 2) return list.slice(0, 6);
  }

  const labeled = ["A", "B", "C", "D", "E", "F"].flatMap((letter) => {
    const value =
      row[letter] ??
      row[letter.toLowerCase()] ??
      row[`option${letter}`] ??
      row[`option_${letter}`];
    return value != null && String(value).trim()
      ? [sanitizeText(String(value), 240)]
      : [];
  });
  if (labeled.length >= 2) return labeled.slice(0, 6);

  const numbered = ["1", "2", "3", "4", "5", "6"].flatMap((num) => {
    const value =
      row[num] ??
      row[`(${num})`] ??
      row[`option${num}`] ??
      row[`opt${num}`];
    return value != null && String(value).trim()
      ? [sanitizeText(String(value), 240)]
      : [];
  });
  return numbered.slice(0, 6);
}

function promptFromRow(row: Record<string, unknown>) {
  const value =
    row.prompt ?? row.question ?? row.stem ?? row.text ?? row.q ?? "";
  return sanitizeText(String(value), 800);
}

function answerIndexFromRow(row: Record<string, unknown>, optionCount: number) {
  const raw = row.answerIndex ?? row.correctIndex ?? row.answer ?? row.correct;
  if (typeof raw === "number" && Number.isInteger(raw)) {
    return raw >= 0 && raw < optionCount ? raw : 0;
  }
  const text = String(raw ?? "").trim();
  const letter = text.match(/[A-Fa-f]/);
  if (letter) {
    const index = letter[0].toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < optionCount) return index;
  }
  const num = text.match(/[1-6]/);
  if (num) {
    const index = Number(num[0]) - 1;
    if (index >= 0 && index < optionCount) return index;
  }
  const hit = optionsFromRow(row).findIndex(
    (option) => option && option === sanitizeText(text, 240),
  );
  return hit >= 0 ? hit : 0;
}

export function normalizePollQuestions(raw: unknown): McqPollQuestion[] {
  return asList(raw)
    .slice(0, 25)
    .map((item, index) => {
      const row = (item || {}) as Record<string, unknown>;
      const options = optionsFromRow(row);
      if (options.length < 2) return null;
      const prompt = promptFromRow(row);
      if (!prompt) return null;
      return {
        id: String(row.id || `q_${index + 1}`).slice(0, 40),
        prompt,
        options,
        answerIndex: answerIndexFromRow(row, options.length),
      };
    })
    .filter((row): row is McqPollQuestion => Boolean(row))
    .map(polishPollQuestion);
}

export function polishPollQuestion(question: McqPollQuestion): McqPollQuestion {
  const cleaned = {
    ...question,
    prompt: question.prompt.replace(/\s*NUMBERS_SEEN:.*$/i, "").trim(),
    options: question.options.map((option) =>
      sanitizeText(option.replace(/\s*NUMBERS_SEEN:.*$/i, ""), 240),
    ),
  };
  const split = splitLabeledChoices(cleaned.prompt);
  if (!split || split.options.length < 2) return cleaned;
  return {
    ...cleaned,
    prompt: split.prompt || cleaned.prompt,
    options: split.options,
  };
}

const OPTION_LINE =
  /^\s*(?:\(([1-4A-Da-d])\)|([1-4A-Da-d])[.)]|([A-D])\s*[-–:])\s+(.+?)\s*$/;
const QUESTION_LINE = /^\s*(\d{1,2})[.)]\s+(.+?)\s*$/;

export function splitLabeledChoices(text: string) {
  const marks = [...text.matchAll(/\(\s*([1-4A-Da-d])\s*\)\s*/g)];
  if (marks.length < 2) return null;
  const first = marks[0].index ?? 0;
  const prompt = sanitizeText(text.slice(0, first), 800);
  const options = marks
    .map((mark, index) => {
      const start = (mark.index ?? 0) + mark[0].length;
      const end =
        index + 1 < marks.length ? marks[index + 1].index : text.length;
      return sanitizeText(text.slice(start, end ?? text.length), 240);
    })
    .filter((item) => item.length > 1)
    .slice(0, 6);
  if (options.length < 2) return null;
  return { prompt, options };
}

export function extractMcqFromPlainText(text: string): McqPollQuestion[] {
  const lines = sanitizeMultiline(text, 40_000).split(/\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let lastN = 0;

  const flush = () => {
    if (current.length) blocks.push(current.join("\n"));
    current = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const numbered = line.match(QUESTION_LINE);
    if (numbered) {
      const n = Number(numbered[1]);
      const stem = numbered[2] || "";
      const sequential = n === lastN + 1 || (lastN === 0 && n >= 1 && n <= 3);
      if (sequential || stem.length > 8) {
        flush();
        current = [stem];
        lastN = n;
        continue;
      }
    }
    if (current.length) current.push(line);
  }
  flush();

  const fromBlocks = blocks
    .slice(0, 25)
    .map((block, index) => {
      const split = splitLabeledChoices(block);
      if (!split?.prompt || split.options.length < 2) return null;
      return polishPollQuestion({
        id: `q_${index + 1}`,
        prompt: split.prompt,
        options: split.options,
        answerIndex: 0,
      });
    })
    .filter((row): row is McqPollQuestion => Boolean(row));
  if (fromBlocks.length) return fromBlocks;

  const found: { prompt: string; options: string[] }[] = [];
  let row: { prompt: string; options: string[] } | null = null;
  const push = () => {
    if (row && row.prompt.length > 8 && row.options.length >= 2) found.push(row);
    row = null;
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const option = line.match(OPTION_LINE);
    if (option) {
      const body = sanitizeText(option[4] || "", 240);
      if (!body) continue;
      if (!row) row = { prompt: "", options: [] };
      if (row.options.length < 6) row.options.push(body);
      continue;
    }
    const question = line.match(QUESTION_LINE);
    if (question && question[2].length > 8) {
      push();
      row = { prompt: sanitizeText(question[2], 800), options: [] };
      continue;
    }
    if (row && row.options.length === 0) {
      row.prompt = sanitizeText(`${row.prompt} ${line}`, 800);
    }
  }
  push();
  return found.slice(0, 25).map((item, index) =>
    polishPollQuestion({
      id: `q_${index + 1}`,
      prompt: item.prompt,
      options: item.options,
      answerIndex: 0,
    }),
  );
}

function compactChars(value: string) {
  return value.replace(/\s+/g, "");
}

export function groundedInTranscript(
  question: McqPollQuestion,
  transcript: string,
) {
  const blob = compactChars(transcript);
  const stem = compactChars(question.prompt);
  if (stem.length < 10 || blob.length < 20) return false;
  let hits = 0;
  let windows = 0;
  for (let i = 0; i + 8 <= stem.length; i += 10) {
    windows += 1;
    if (blob.includes(stem.slice(i, i + 8))) hits += 1;
  }
  return hits >= Math.max(1, Math.ceil(windows / 3));
}

function titleFromRaw(raw: unknown, fileName: string) {
  const record = raw as { title?: unknown } | null;
  const title = sanitizeText(String(record?.title || ""), 120);
  if (title) return title;
  return fileName.replace(/\.[^.]+$/, "") || "MCQ poll";
}

function parseExtracted(raw: string | null, fileName: string) {
  if (!raw) return { title: titleFromRaw(null, fileName), questions: [] as McqPollQuestion[] };
  const parsed = parseAiJson(raw);
  const questions = normalizePollQuestions(parsed);
  if (questions.length) {
    return { title: titleFromRaw(parsed, fileName), questions };
  }
  return {
    title: titleFromRaw(null, fileName),
    questions: extractMcqFromPlainText(raw),
  };
}

export async function extractMcqFromFile(input: {
  bytes: Uint8Array;
  fileName: string;
  mime: string;
}) {
  const { bytes, fileName, mime } = input;

  if (mime === "application/pdf") {
    try {
      const text = sanitizeMultiline(await extractPdfText(bytes), 40_000);
      const fromRegex = extractMcqFromPlainText(text);
      if (fromRegex.length) {
        return { title: titleFromRaw(null, fileName), questions: fromRegex };
      }
      if (text.length > 40 && isAiConfigured()) {
        const raw = await extractMcqsFromText(fileName, text);
        const fromText = questionsFromTranscript(raw, text, fileName);
        if (fromText.questions.length) return fromText;
      }
    } catch (error) {
      console.error(
        "poll pdf",
        error instanceof Error ? error.message.slice(0, 180) : "pdf",
      );
    }
  }

  if (isAiConfigured()) {
    try {
      const transcript = await transcribePaper({ bytes, mime });
      if (transcript) {
        const page = transcript.replace(/^NUMBERS_SEEN:.*$/im, "").trim();
        const fromRegex = extractMcqFromPlainText(page);
        if (fromRegex.length) {
          return { title: titleFromRaw(null, fileName), questions: fromRegex };
        }
        const raw = await extractMcqsFromText(fileName, transcript);
        const fromText = questionsFromTranscript(raw, page, fileName);
        if (fromText.questions.length) return fromText;
      }
    } catch (error) {
      console.error(
        "poll ocr",
        error instanceof Error ? error.message.slice(0, 180) : "ocr",
      );
    }
  }

  return { title: titleFromRaw(null, fileName), questions: [] as McqPollQuestion[] };
}

function questionsFromTranscript(
  raw: string | null,
  transcript: string,
  fileName: string,
) {
  const parsed = parseExtracted(raw, fileName);
  const grounded = parsed.questions.filter((question) =>
    groundedInTranscript(question, transcript),
  );
  return {
    title: parsed.title,
    questions: grounded.length ? grounded : extractMcqFromPlainText(transcript),
  };
}
