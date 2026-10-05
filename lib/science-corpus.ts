import { readFileSync } from "node:fs";
import { join } from "node:path";

export type CorpusPage = {
  file_name: string;
  doc_type: string;
  grade: number;
  subject: string;
  page_number: number;
  content: string;
};

let cache: CorpusPage[] | null = null;

function loadCorpus(): CorpusPage[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(
      readFileSync(join(process.cwd(), "grade11_science_corpus.json"), "utf8"),
    ) as CorpusPage[];
  } catch {
    cache = [];
  }
  return cache;
}

const ALIASES: Record<string, string> = {
  xylem: "ශෛලම",
  phloem: "ප්ලෝයම",
  heat: "තාපය",
  tissue: "පටක",
  tissues: "පටක",
  pataka: "පටක",
  patak: "පටක",
  jiweka: "ජීවී",
  jeewi: "ජීවී",
  jeevi: "ජීවී",
  sathwa: "සත්ත්ව",
  saththwa: "සත්ත්ව",
  animal: "සත්ත්ව",
  plant: "ශාක",
  shaka: "ශාක",
  shaaka: "ශාක",
  tharanga: "තරංග",
  yathrika: "යාන්ත්‍රික",
  wave: "තරංග",
  waves: "තරංග",
  photosynthesis: "ප්‍රභාසංශ්ලේෂණය",
  circulation: "සංසරණය",
  digestion: "ජීරණය",
};

function wordsOf(query: string) {
  const base = query
    .toLowerCase()
    .split(/[^a-z0-9\u0d80-\u0dff]+/i)
    .filter((word) => word.length > 2);
  return [...new Set(base.flatMap((word) => [word, ALIASES[word] || ""].filter(Boolean)))];
}

function scorePage(page: CorpusPage, words: string[]) {
  const hay = `${page.doc_type} ${page.file_name} ${page.content}`.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (hay.includes(word)) score += word.length > 5 ? 2 : 1;
  }
  if (
    score > 0 &&
    (page.doc_type === "teachers_guide" || page.doc_type === "textbook")
  ) {
    score += 1;
  }
  return score;
}

export function shouldUseScienceCorpus(
  _grade?: string,
  _subject?: string,
  _query?: string,
) {
  return true;
}

export function retrieveScienceCorpus(query: string, limit = 3) {
  const words = wordsOf(query);
  if (!words.length) return [];
  return loadCorpus()
    .map((page) => ({ page, score: scorePage(page, words) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.page);
}

export type LessonSourceScope = {
  book?: string;
  pageStart?: number;
  pageEnd?: number;
};

function inLessonRange(page: CorpusPage, scope?: LessonSourceScope) {
  if (!scope?.book || page.file_name !== scope.book) return false;
  const start = scope.pageStart ?? 0;
  const end = scope.pageEnd ?? Number.POSITIVE_INFINITY;
  return page.page_number >= start && page.page_number <= end;
}

export function retrieveLessonPartSources(
  query: string,
  scope?: LessonSourceScope,
) {
  const words = wordsOf(query);
  const scored = loadCorpus()
    .map((page) => {
      let score = words.length ? scorePage(page, words) : 0;
      if (inLessonRange(page, scope)) score += 10;
      else if (
        scope?.book &&
        page.doc_type === "textbook" &&
        page.file_name !== scope.book
      ) {
        score = 0;
      }
      return { page, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const ranged = scored.filter((row) => inLessonRange(row.page, scope));
  const textbook = (ranged.length ? ranged : scored)
    .filter((row) => row.page.doc_type === "textbook")
    .slice(0, 2)
    .map((row) => row.page);
  const guide = scored
    .filter((row) => row.page.doc_type === "teachers_guide")
    .slice(0, 1)
    .map((row) => row.page);
  const mixed = [...textbook, ...guide];
  return mixed.length
    ? mixed
    : scored.slice(0, 3).map((row) => row.page);
}

export function withScienceCorpus(
  prompt: string,
  query?: string,
  grade?: string,
  subject?: string,
  limit = 3,
) {
  if (!shouldUseScienceCorpus(grade, subject, query)) return prompt;
  const block = formatScienceCorpusForAi(query, limit);
  return block ? `${prompt}\n\n${block}` : prompt;
}

export function formatScienceCorpusForAi(query?: string, limit = 3) {
  const pages = retrieveScienceCorpus(
    query || "ශාක පටක සංසරණය තාපය විද්‍යාව",
    limit,
  );
  if (!pages.length) return "";
  return [
    "Grade 11 Science official pages from uploaded NIE PDFs (use these chunks; do not invent extra official text):",
    ...pages.map(
      (page, index) =>
        `[${index + 1}] ${page.doc_type} · ${page.file_name} · p.${page.page_number}\n${page.content.slice(0, 900)}`,
    ),
  ].join("\n\n");
}

export function excerptForQuestion(query: string, scope?: LessonSourceScope) {
  const pages = retrieveLessonPartSources(query, scope);
  if (!pages.length) return "";
  const words = wordsOf(query);
  const chunks = pages.flatMap((page) =>
    page.content
      .split(/(?<=[.\n!?])\s+/)
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter((item) => item.length > 18 && (item.match(/\sx\s/g) || []).length < 3),
  );
  const ranked = chunks
    .map((text) => ({
      text,
      score: words.reduce(
        (score, word) => score + (text.toLowerCase().includes(word) ? 1 : 0),
        0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const picked = (ranked.length ? ranked : chunks.map((text) => ({ text })))
    .slice(0, 3)
    .map((row) => row.text);
  return picked.join(" ").slice(0, 560).trim();
}

export function formatLessonSourcesForAi(
  query: string,
  scope?: LessonSourceScope,
) {
  const pages = retrieveLessonPartSources(query, scope);
  if (!pages.length) return "";
  return [
    "Teach and ANSWER from BOTH sources when present: textbook (student facts) and teachers_guide (how to teach / checks). Stay inside these pages. If the student asked a question, answer that question first from these pages:",
    ...pages.map(
      (page, index) =>
        `[${index + 1}] ${page.doc_type} · ${page.file_name} · p.${page.page_number}\n${page.content.slice(0, 1100)}`,
    ),
  ].join("\n\n");
}
