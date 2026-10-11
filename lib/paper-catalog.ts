"use client";

import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { setDbPapers } from "./papers";
import type { PaperItem, PaperKind, QuizQuestion } from "./types";

type PaperRow = {
  id: string;
  kind: PaperKind;
  title: string;
  subject: string;
  year: string | null;
  created_at: string;
};

type QuestionRow = {
  id: string;
  paper_id: string;
  prompt: string;
  options: string[] | null;
  answer_index: number | null;
  explanation: string | null;
  subject: string | null;
  sort_order: number | null;
};

async function fetchAll<T>(
  run: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const page = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await run(from, from + page - 1);
    if (error) throw new Error(error.message);
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < page) break;
  }
  return rows;
}

function asQuestion(row: QuestionRow): QuizQuestion | null {
  const prompt = String(row.prompt || "").trim();
  const options = Array.isArray(row.options)
    ? row.options.map((option) => String(option))
    : [];
  if (!prompt || options.length < 2) return null;
  let answerIndex = Number(row.answer_index);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
    answerIndex = 0;
  }
  return {
    id: row.id,
    prompt,
    options,
    answerIndex,
    explanation: row.explanation || "",
    subject: row.subject || undefined,
  };
}

export async function loadCatalogPapersFromDb(): Promise<PaperItem[]> {
  if (!isSupabaseConfigured()) {
    setDbPapers([]);
    return [];
  }
  const supabase = createClient();
  if (!supabase) {
    setDbPapers([]);
    return [];
  }

  const papers = await fetchAll<PaperRow>((from, to) =>
    supabase
      .from("study_papers")
      .select("id, kind, title, subject, year, created_at")
      .in("kind", ["past", "model"])
      .order("created_at", { ascending: false })
      .range(from, to),
  );

  if (!papers.length) {
    setDbPapers([]);
    return [];
  }

  const byPaper = new Map<string, QuizQuestion[]>();
  const ids = papers.map((row) => row.id);
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const questions = await fetchAll<QuestionRow>((from, to) =>
      supabase
        .from("study_paper_questions")
        .select(
          "id, paper_id, prompt, options, answer_index, explanation, subject, sort_order",
        )
        .in("paper_id", chunk)
        .order("sort_order")
        .range(from, to),
    );
    for (const row of questions) {
      const question = asQuestion(row);
      if (!question) continue;
      const list = byPaper.get(row.paper_id) || [];
      list.push(question);
      byPaper.set(row.paper_id, list);
    }
  }

  const items = papers
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      subject: row.subject,
      year: row.year || undefined,
      createdAt: row.created_at,
      questions: byPaper.get(row.id) || [],
    }))
    .filter((item) => item.questions.length > 0);

  setDbPapers(items);
  return items;
}
