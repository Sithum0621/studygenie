import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerSupabase } from "./supabase/server";
import type { McqPoll, McqPollQuestion, McqPollSummary, McqPollVote, PollQuestionStat } from "./types";

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

function asQuestions(raw: unknown): McqPollQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id || `q${index}`),
      prompt: String(item.prompt || ""),
      options: Array.isArray(item.options) ? item.options.map(String) : [],
      answerIndex: Number(item.answerIndex ?? item.answer_index ?? 0),
    };
  });
}

function asVotes(raw: unknown): McqPollVote[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      voterKey: String(item.voterKey || item.voter_key || ""),
      answers: Array.isArray(item.answers) ? item.answers.map(Number) : [],
      createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
    };
  });
}

async function savePollRows(
  poll: McqPoll,
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>,
) {
  const { data: auth } = await supabase.auth.getUser();
  const { data: existing } = await supabase
    .from("mcq_polls")
    .select("owner_id")
    .eq("id", poll.id)
    .maybeSingle();
  const ownerId = auth.user?.id || existing?.owner_id || null;

  const header: Record<string, unknown> = {
    id: poll.id,
    share_code: poll.code,
    title: poll.title,
    file_name: poll.fileName,
    questions: poll.questions,
    votes: poll.votes,
    created_at: poll.createdAt,
  };
  if (ownerId) header.owner_id = ownerId;

  await supabase.from("mcq_polls").upsert(header);

  const { error: questionError } = await supabase
    .from("mcq_poll_questions")
    .delete()
    .eq("poll_id", poll.id);
  if (questionError) return;

  if (poll.questions.length) {
    const { error } = await supabase.from("mcq_poll_questions").insert(
      poll.questions.map((question, index) => ({
        id: question.id,
        poll_id: poll.id,
        prompt: question.prompt,
        options: question.options,
        answer_index: question.answerIndex,
        sort_order: index,
      })),
    );
    if (error) return;
  }

  await supabase.from("mcq_poll_votes").delete().eq("poll_id", poll.id);
  if (poll.votes.length) {
    const votes = poll.votes.map((vote) => ({
      id: `${poll.id}:${vote.voterKey}`,
      poll_id: poll.id,
      voter_key: vote.voterKey,
      created_at: vote.createdAt,
    }));
    const { error: voteError } = await supabase.from("mcq_poll_votes").insert(votes);
    if (voteError) return;
    const answers = poll.votes.flatMap((vote) =>
      vote.answers
        .map((optionIndex, questionIndex) => {
          const question = poll.questions[questionIndex];
          if (!question) return null;
          return {
            vote_id: `${poll.id}:${vote.voterKey}`,
            question_id: question.id,
            option_index: optionIndex,
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    );
    if (answers.length) {
      await supabase.from("mcq_poll_vote_answers").insert(answers);
    }
  }

  if (ownerId) {
    await supabase.from("teacher_polls").upsert({
      id: poll.id,
      user_id: ownerId,
      poll_id: poll.id,
      title: poll.title,
      share_code: poll.code,
      file_name: poll.fileName,
      question_count: poll.questions.length,
      vote_count: poll.votes.length,
      created_at: poll.createdAt,
    });
  }
}

async function readPollFromDb(code: string): Promise<McqPoll | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: header } = await supabase
    .from("mcq_polls")
    .select("id, share_code, title, file_name, questions, votes, created_at")
    .eq("share_code", code)
    .maybeSingle();
  if (!header) return null;

  const { data: questionRows } = await supabase
    .from("mcq_poll_questions")
    .select("id, prompt, options, answer_index, sort_order")
    .eq("poll_id", header.id)
    .order("sort_order");

  const questions = questionRows?.length
    ? asQuestions(questionRows)
    : asQuestions(header.questions);

  const { data: voteRows } = await supabase
    .from("mcq_poll_votes")
    .select("id, voter_key, created_at")
    .eq("poll_id", header.id)
    .order("created_at");

  let votes = asVotes(header.votes);
  if (voteRows?.length) {
    const { data: answerRows } = await supabase
      .from("mcq_poll_vote_answers")
      .select("vote_id, question_id, option_index")
      .in(
        "vote_id",
        voteRows.map((row) => row.id),
      );
    const byVote = new Map<string, number[]>();
    for (const answer of answerRows || []) {
      const list = byVote.get(answer.vote_id) || [];
      const questionIndex = questions.findIndex((question) => question.id === answer.question_id);
      if (questionIndex >= 0) list[questionIndex] = answer.option_index;
      byVote.set(answer.vote_id, list);
    }
    votes = voteRows.map((row) => ({
      voterKey: row.voter_key,
      answers: questions.map((_, index) => byVote.get(row.id)?.[index] ?? -1),
      createdAt: row.created_at,
    }));
  }

  return {
    id: header.id,
    code: header.share_code,
    title: header.title,
    fileName: header.file_name,
    questions,
    votes,
    createdAt: header.created_at,
  };
}

export async function savePoll(poll: McqPoll) {
  await ensureDir();
  await writeFile(filePath(poll.code), JSON.stringify(poll), "utf8");
  const supabase = await createServerSupabase();
  if (supabase) {
    await savePollRows(poll, supabase);
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
    const poll = await readPollFromDb(safe);
    if (!poll) return null;
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

export function pollTeacherStats(poll: McqPoll) {
  const people = poll.votes.length;
  const questions: PollQuestionStat[] = poll.questions.map((question, qIndex) => {
    const counts = question.options.map(() => 0);
    let answered = 0;
    let wrongCount = 0;
    for (const vote of poll.votes) {
      const pick = vote.answers[qIndex];
      if (typeof pick !== "number" || pick < 0 || pick >= question.options.length) {
        continue;
      }
      counts[pick] += 1;
      answered += 1;
      if (pick !== question.answerIndex) wrongCount += 1;
    }
    return {
      id: question.id,
      number: qIndex + 1,
      prompt: question.prompt,
      options: question.options,
      answerIndex: question.answerIndex,
      counts,
      answered,
      wrongCount,
      wrongPct: answered ? Math.round((wrongCount / answered) * 100) : 0,
    };
  });
  const hardest = [...questions]
    .filter((row) => row.wrongCount > 0)
    .sort(
      (a, b) => b.wrongPct - a.wrongPct || b.wrongCount - a.wrongCount,
    )
    .slice(0, 3);
  const easiest = [...questions]
    .filter((row) => row.answered > 0 && row.wrongCount < row.answered)
    .sort(
      (a, b) =>
        a.wrongPct - b.wrongPct ||
        b.answered - b.wrongCount - (a.answered - a.wrongCount),
    )
    .slice(0, 3);
  const answeredTotal = questions.reduce((sum, row) => sum + row.answered, 0);
  const correctTotal = questions.reduce(
    (sum, row) => sum + (row.answered - row.wrongCount),
    0,
  );
  const scorePct = answeredTotal
    ? Math.round((correctTotal / answeredTotal) * 100)
    : 0;
  return { people, scorePct, questions, hardest, easiest };
}

export function toSummary(poll: McqPoll) {
  return summaryOf(poll);
}

export function newVoterKey() {
  return crypto.randomUUID();
}
