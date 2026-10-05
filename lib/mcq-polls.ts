import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerSupabase } from "./supabase/server";
import type { McqPoll, McqPollSummary, McqPollVote } from "./types";

const DIR = path.join(process.cwd(), "data", "mcq-polls");

function codeOf() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function summaryOf(poll: McqPoll): McqPollSummary {
  return {
    id: poll.id,
    code: poll.code,
    title: poll.title,
    fileName: poll.fileName,
    questionCount: poll.questions.length,
    voteCount: poll.votes.length,
    createdAt: poll.createdAt,
  };
}

function filePath(code: string) {
  return path.join(DIR, `${code}.json`);
}

async function ensureDir() {
  await mkdir(DIR, { recursive: true });
}

export async function savePoll(poll: McqPoll) {
  await ensureDir();
  await writeFile(filePath(poll.code), JSON.stringify(poll), "utf8");
  const supabase = await createServerSupabase();
  if (supabase) {
    await supabase.from("mcq_polls").upsert({
      id: poll.id,
      share_code: poll.code,
      title: poll.title,
      file_name: poll.fileName,
      questions: poll.questions,
      votes: poll.votes,
      created_at: poll.createdAt,
    });
  }
  return poll;
}

export async function createPoll(input: {
  title: string;
  fileName: string;
  questions: McqPoll["questions"];
}) {
  const poll: McqPoll = {
    id: crypto.randomUUID(),
    code: codeOf(),
    title: input.title,
    fileName: input.fileName,
    questions: input.questions,
    votes: [],
    createdAt: new Date().toISOString(),
  };
  await savePoll(poll);
  return poll;
}

export async function readPoll(code: string) {
  const safe = code.replace(/[^a-zA-Z0-9]/g, "");
  if (safe.length < 8) return null;
  try {
    const raw = await readFile(filePath(safe), "utf8");
    return JSON.parse(raw) as McqPoll;
  } catch {
    const supabase = await createServerSupabase();
    if (!supabase) return null;
    const { data } = await supabase
      .from("mcq_polls")
      .select("id, share_code, title, file_name, questions, votes, created_at")
      .eq("share_code", safe)
      .maybeSingle();
    if (!data) return null;
    const poll: McqPoll = {
      id: data.id,
      code: data.share_code,
      title: data.title,
      fileName: data.file_name,
      questions: data.questions || [],
      votes: data.votes || [],
      createdAt: data.created_at,
    };
    await ensureDir();
    await writeFile(filePath(poll.code), JSON.stringify(poll), "utf8");
    return poll;
  }
}

export async function addVote(
  code: string,
  voterKey: string,
  answers: number[],
): Promise<{ poll: McqPoll; updated: boolean } | null> {
  const poll = await readPoll(code);
  if (!poll) return null;
  const key = voterKey.slice(0, 80);
  const existing = poll.votes.find((row) => row.voterKey === key);
  if (existing) return { poll, updated: false };
  const vote: McqPollVote = {
    voterKey: key,
    answers,
    createdAt: new Date().toISOString(),
  };
  poll.votes = [...poll.votes, vote];
  await savePoll(poll);
  return { poll, updated: true };
}

export function publicQuestions(poll: McqPoll) {
  return poll.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
  }));
}

export function pollTallies(poll: McqPoll) {
  return poll.questions.map((question, qIndex) => {
    const counts = question.options.map(() => 0);
    for (const vote of poll.votes) {
      const pick = vote.answers[qIndex];
      if (typeof pick === "number" && pick >= 0 && pick < counts.length) {
        counts[pick] += 1;
      }
    }
    return { id: question.id, counts, total: poll.votes.length };
  });
}

export function toSummary(poll: McqPoll) {
  return summaryOf(poll);
}

export function newVoterKey() {
  return crypto.randomUUID();
}
