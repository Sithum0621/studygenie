import { preparePaperPng } from "./paper-image";
import {
  completeWithAi,
  completeWithAiVision,
  completeWithGeminiMedia,
  type AiHistoryTurn,
} from "./ai";
import {
  AI_JOBS,
  DAILY_QUIZ_SYSTEM,
  DAILY_TASKS_SYSTEM,
  OCR_SYSTEM,
  OCR_TRANSCRIBE_SYSTEM,
  OCR_TRANSCRIBE_USER,
  TUTOR_SYSTEM,
} from "./ai-jobs";

function withSystem(jobSystem: string, extra: string) {
  const extraTrim = extra.trim();
  return extraTrim ? `${jobSystem}\n\n${extraTrim}` : jobSystem;
}

const OCR_WINDOWS = [
  "Copy ONLY questions 1, 2 and 3 from the image, with their (1)(2)(3)(4) options. Then stop. Do not write questions 4-10.",
  "Copy ONLY questions 4, 5 and 6 from the image, with their (1)(2)(3)(4) options. Then stop. Do not write other questions.",
  "Copy ONLY questions 7, 8, 9 and 10 from the image, with their (1)(2)(3)(4) options. Then stop. Do not write questions 1-6.",
];

export async function transcribePaper(input: {
  bytes: Uint8Array;
  mime: string;
}) {
  const job = AI_JOBS.ocr;
  const chunkTimeout = Math.min(40_000, job.timeoutMs);
  const prepared =
    input.mime === "image/png" ? preparePaperPng(input.bytes) : null;
  const slices =
    prepared?.bands.map((bytes) => ({ bytes, mime: "image/png" as const })) ||
    [{ bytes: prepared?.full || input.bytes, mime: input.mime }];

  const readWindow = async (
    window: string,
    slice: { bytes: Uint8Array; mime: string },
  ) => {
    try {
      const media = await completeWithGeminiMedia(
        `${OCR_TRANSCRIBE_USER}\n\n${window}`,
        slice.bytes,
        slice.mime,
        chunkTimeout,
        job.temperature,
        false,
        OCR_TRANSCRIBE_SYSTEM,
      );
      if (media && media.trim().length > 20 && !/^empty$/i.test(media.trim())) {
        return media;
      }
    } catch {
      // Vision fallback below
    }
    if (!slice.mime.startsWith("image/")) return null;
    const vision = await completeWithAiVision(
      `${OCR_TRANSCRIBE_SYSTEM}\n\n${OCR_TRANSCRIBE_USER}\n\n${window}`,
      slice.bytes,
      slice.mime,
      chunkTimeout,
      job.temperature,
      false,
    );
    if (vision && vision.trim().length > 20 && !/^empty$/i.test(vision.trim())) {
      return vision;
    }
    return null;
  };

  const windows = slices.length === 3 ? OCR_WINDOWS : [
    "Transcribe the full page as plain text in print order.",
  ];
  const chunks = await Promise.all(
    windows.map((window, index) =>
      readWindow(window, slices[Math.min(index, slices.length - 1)]),
    ),
  );
  const joined = chunks.filter(Boolean).join("\n");
  if (joined.replace(/\s+/g, "").length > 40) return joined;
  return readWindow(
    "Transcribe the full page as plain text in print order.",
    { bytes: prepared?.full || input.bytes, mime: prepared ? "image/png" : input.mime },
  );
}

export async function extractMcqsFromText(fileName: string, text: string) {
  const job = AI_JOBS.ocr;
  return completeWithAi(
    OCR_SYSTEM,
    `File: ${fileName}\n\nOCR transcript:\n${text}`,
    job.timeoutMs,
    job.temperature,
    job.json,
  );
}

export async function chatWithTutor(
  extraSystem: string,
  history: string | AiHistoryTurn[],
  json = false,
) {
  const job = AI_JOBS.tutor;
  return completeWithAi(
    withSystem(TUTOR_SYSTEM, extraSystem),
    history,
    job.timeoutMs,
    job.temperature,
    json,
  );
}

export async function generateDailyQuiz(extraSystem: string, user: string) {
  const job = AI_JOBS.dailyQuiz;
  return completeWithAi(
    withSystem(DAILY_QUIZ_SYSTEM, extraSystem),
    user,
    job.timeoutMs,
    job.temperature,
    job.json,
  );
}

export async function generateDailyTasks(extraSystem: string, user: string) {
  const job = AI_JOBS.dailyTasks;
  return completeWithAi(
    withSystem(DAILY_TASKS_SYSTEM, extraSystem),
    user,
    job.timeoutMs,
    job.temperature,
    job.json,
  );
}
