import { NextResponse } from "next/server";
import {
  addVote,
  newVoterKey,
  pollTallies,
  publicQuestions,
  readPoll,
  toSummary,
} from "@/lib/mcq-polls";
import { allowRequest, clientKey } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ code: string }> };

function cookieFrom(request: Request) {
  const raw = request.headers.get("cookie") || "";
  const match = raw.match(/(?:^|;\s*)sg_voter=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function withVoter(response: NextResponse, voterKey: string) {
  response.cookies.set("sg_voter", voterKey, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}

export async function GET(request: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const poll = await readPoll(code);
  if (!poll) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  const voterKey = cookieFrom(request);
  const voted = Boolean(voterKey && poll.votes.some((row) => row.voterKey === voterKey));
  const wantResults = new URL(request.url).searchParams.get("results") === "1";
  return NextResponse.json({
    poll: toSummary(poll),
    questions: publicQuestions(poll),
    voted,
    tallies: voted || wantResults ? pollTallies(poll) : undefined,
  });
}

export async function POST(request: Request, ctx: Ctx) {
  if (!allowRequest(`poll-vote:${clientKey(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const { code } = await ctx.params;
  const json = (await request.json().catch(() => null)) as {
    answers?: unknown;
  } | null;
  const answers = Array.isArray(json?.answers)
    ? json.answers.map((item) => Number(item))
    : [];
  const poll = await readPoll(code);
  if (!poll) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  if (answers.length !== poll.questions.length) {
    return NextResponse.json({ error: "answers" }, { status: 400 });
  }
  const valid = poll.questions.every((question, index) => {
    const pick = answers[index];
    return (
      Number.isInteger(pick) && pick >= 0 && pick < question.options.length
    );
  });
  if (!valid) {
    return NextResponse.json({ error: "answers" }, { status: 400 });
  }

  const voterKey = cookieFrom(request) || newVoterKey();
  const result = await addVote(code, voterKey, answers);
  if (!result) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }
  return withVoter(
    NextResponse.json({
      poll: toSummary(result.poll),
      questions: publicQuestions(result.poll),
      voted: true,
      updated: result.updated,
      tallies: pollTallies(result.poll),
    }),
    voterKey,
  );
}
