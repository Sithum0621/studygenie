import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { localStore } from "./local-store";
import type { DailyQuestion } from "./types";

type DailyQuestionRow = {
  id: string;
  subject: string;
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string | null;
  created_at: string;
};

function fromRow(row: DailyQuestionRow): DailyQuestion {
  return {
    id: row.id,
    subject: row.subject,
    prompt: row.prompt,
    options: row.options,
    answerIndex: row.answer_index,
    explanation: row.explanation || "",
    createdAt: row.created_at,
  };
}

function cache(items: DailyQuestion[]) {
  localStore.saveDailyQuestions(items);
}

function cacheOne(item: DailyQuestion) {
  const items = localStore.getDailyQuestions();
  cache(
    items.some((row) => row.id === item.id)
      ? items.map((row) => (row.id === item.id ? item : row))
      : [item, ...items],
  );
}

export async function loadDailyQuestions(): Promise<DailyQuestion[]> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("daily_questions")
        .select("id, subject, prompt, options, answer_index, explanation, created_at")
        .order("created_at", { ascending: false });
      if (!error && data) {
        const items = (data as DailyQuestionRow[]).map(fromRow);
        cache(items);
        return items;
      }
    }
  }
  return localStore.getDailyQuestions();
}

export async function upsertDailyQuestion(item: DailyQuestion) {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const { data: session } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("daily_questions")
        .upsert({
          id: item.id,
          subject: item.subject,
          prompt: item.prompt,
          options: item.options,
          answer_index: item.answerIndex,
          explanation: item.explanation,
          created_by: session.user?.id ?? null,
        })
        .select("id, subject, prompt, options, answer_index, explanation, created_at")
        .single();
      if (!error && data) {
        const saved = fromRow(data as DailyQuestionRow);
        cacheOne(saved);
        return saved;
      }
    }
  }

  const saved: DailyQuestion = {
    ...item,
    id: item.id || crypto.randomUUID(),
    createdAt: item.createdAt || new Date().toISOString(),
  };
  cacheOne(saved);
  return saved;
}

export async function deleteDailyQuestion(id: string) {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      await supabase.from("daily_questions").delete().eq("id", id);
    }
  }
  cache(localStore.getDailyQuestions().filter((item) => item.id !== id));
}
