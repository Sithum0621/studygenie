import { localStore } from "./local-store";
import type { SyllabusChunk } from "./types";

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;
const MAX_CHUNKS = 240;

export function guessSourceKind(name: string): SyllabusChunk["kind"] {
  const hay = name.toLowerCase();
  if (
    hay.includes("gurumarga") ||
    hay.includes("guru marga") ||
    hay.includes("teacher") ||
    hay.includes("tim") ||
    hay.includes("instructional")
  ) {
    return "teacher-guide";
  }
  if (hay.includes("syllab") || hay.includes("niti") || hay.includes("curriculum")) {
    return "syllabus";
  }
  return "notes";
}

export function chunkText(text: string) {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (!clean) return [];
  const parts: string[] = [];
  let index = 0;
  while (index < clean.length) {
    const end = Math.min(clean.length, index + CHUNK_SIZE);
    let slice = clean.slice(index, end);
    const lastBreak = slice.lastIndexOf("\n\n");
    if (end < clean.length && lastBreak > CHUNK_SIZE / 2) {
      slice = slice.slice(0, lastBreak);
    }
    const piece = slice.trim();
    if (piece.length > 40) parts.push(piece);
    index += Math.max(slice.length - CHUNK_OVERLAP, 200);
  }
  return parts.slice(0, 40);
}

export function indexSyllabusText(input: {
  sourceId: string;
  title: string;
  subject?: string;
  kind?: SyllabusChunk["kind"];
  text: string;
}) {
  const kind = input.kind || guessSourceKind(input.title);
  const createdAt = new Date().toISOString();
  const next = chunkText(input.text).map((text, index) => ({
    id: `${input.sourceId}_${index}`,
    sourceId: input.sourceId,
    title: input.title,
    kind,
    subject: input.subject || "",
    text,
    createdAt,
  }));
  const kept = localStore
    .getSyllabusChunks()
    .filter((row) => row.sourceId !== input.sourceId);
  localStore.saveSyllabusChunks([...next, ...kept].slice(0, MAX_CHUNKS));
  return next.length;
}

export function removeSyllabusSource(sourceId: string) {
  localStore.saveSyllabusChunks(
    localStore.getSyllabusChunks().filter((row) => row.sourceId !== sourceId),
  );
}

function scoreChunk(chunk: SyllabusChunk, words: string[], subjects: string[]) {
  const hay = `${chunk.title} ${chunk.subject} ${chunk.text}`.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (hay.includes(word)) score += word.length > 5 ? 2 : 1;
  }
  if (
    chunk.subject &&
    subjects.some((subject) => subject.toLowerCase() === chunk.subject.toLowerCase())
  ) {
    score += 1;
  }
  return score;
}

export function retrieveSyllabusChunks(input: {
  query?: string;
  subjects?: string[];
  limit?: number;
}) {
  const words = `${input.query || ""} ${(input.subjects || []).join(" ")}`
    .toLowerCase()
    .split(/[^a-z0-9\u0d80-\u0dff]+/i)
    .filter((word) => word.length > 2);
  const unique = [...new Set(words)];
  const ranked = localStore
    .getSyllabusChunks()
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, unique, input.subjects || []),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return (ranked.length
    ? ranked
    : localStore.getSyllabusChunks().map((chunk) => ({ chunk, score: 0 }))
  )
    .slice(0, input.limit ?? 4)
    .map((row) => row.chunk);
}

export function formatRetrievedSources(chunks: SyllabusChunk[]) {
  if (!chunks.length) return "";
  return [
    "Official / uploaded NIE sources (use these chunks; do not invent extra official text):",
    ...chunks.map(
      (chunk, index) =>
        `[${index + 1}] ${chunk.kind} · ${chunk.title}${
          chunk.subject ? ` · ${chunk.subject}` : ""
        }\n${chunk.text.slice(0, 800)}`,
    ),
  ].join("\n\n");
}
