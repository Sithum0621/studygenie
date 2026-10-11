"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { useCopy } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import { onTeacherPollsChange } from "@/lib/poll-share";
import type { McqPollSummary, PollQuestionStat } from "@/lib/types";

type StatsPayload = {
  poll?: McqPollSummary;
  people?: number;
  scorePct?: number;
  questions?: PollQuestionStat[];
  hardest?: PollQuestionStat[];
  easiest?: PollQuestionStat[];
};

function latestPoll() {
  return localStore.getMcqPolls()[0] || null;
}

function topMark(question: PollQuestionStat) {
  let best = 0;
  for (let i = 1; i < question.counts.length; i += 1) {
    if (question.counts[i] > question.counts[best]) best = i;
  }
  return best;
}

export function LatestPaperStats() {
  const copy = useCopy();
  const [paper, setPaper] = useState<McqPollSummary | null>(null);
  const [people, setPeople] = useState(0);
  const [scorePct, setScorePct] = useState(0);
  const [questions, setQuestions] = useState<PollQuestionStat[]>([]);
  const [hardest, setHardest] = useState<PollQuestionStat[]>([]);
  const [easiest, setEasiest] = useState<PollQuestionStat[]>([]);
  const [busy, setBusy] = useState(false);
  const [openSummary, setOpenSummary] = useState(false);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      const latest = latestPoll();
      setPaper(latest);
      if (!latest?.code) {
        setPeople(0);
        setScorePct(0);
        setQuestions([]);
        setHardest([]);
        setEasiest([]);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/polls/${latest.code}?stats=1`);
        const data = (await res.json().catch(() => null)) as StatsPayload | null;
        if (dead) return;
        if (!res.ok || !data) return;
        setPeople(data.people || 0);
        setScorePct(data.scorePct || 0);
        setQuestions(data.questions || []);
        setHardest(data.hardest || []);
        setEasiest(data.easiest || []);
      } catch {
        if (!dead) return;
      } finally {
        if (!dead) setBusy(false);
      }
    };
    void load();
    const unsub = onTeacherPollsChange(() => {
      void load();
    });
    const interval = window.setInterval(() => {
      void load();
    }, 12_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      dead = true;
      unsub();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!paper) return null;

  const tabClass =
    "rounded-xl border border-stone-200 bg-white px-2 py-2 text-left hover:border-teal-600 hover:bg-teal-50";

  return (
    <Card className="space-y-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800">
            {copy.latestPaper}
          </p>
          <p className="truncate text-sm font-medium text-stone-900">{paper.title}</p>
        </div>
        <p className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900">
          {copy.pollPeopleCount.replace("{n}", String(people))}
        </p>
      </div>

      {people === 0 ? (
        <p className="text-xs text-stone-500">
          {busy ? copy.latestPaperLoading : copy.latestPaperNoVotes}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOpenSummary((prev) => !prev)}
              className={`rounded-xl border px-2 py-2 text-left ${
                openSummary
                  ? "border-teal-700 bg-teal-50"
                  : "border-stone-200 bg-white"
              }`}
            >
              <p className="text-[10px] text-stone-500">{copy.pollMarkSummary}</p>
              <p className="text-lg font-semibold text-stone-900">{scorePct}%</p>
            </button>
            <Link href={`/class/papers/${paper.code}/wrong`} className={tabClass}>
              <p className="text-[10px] text-stone-500">{copy.pollHardestTitle}</p>
              <p className="mt-1 text-xs font-medium text-rose-800">
                {hardest.length
                  ? hardest.map((row) => `Q${row.number}`).join(" · ")
                  : copy.pollNoWrongYet}
              </p>
            </Link>
            <Link href={`/class/papers/${paper.code}/correct`} className={tabClass}>
              <p className="text-[10px] text-stone-500">{copy.pollEasiestTitle}</p>
              <p className="mt-1 text-xs font-medium text-emerald-800">
                {easiest.length
                  ? easiest.map((row) => `Q${row.number}`).join(" · ")
                  : copy.pollNoCorrectYet}
              </p>
            </Link>
          </div>

          {openSummary ? (
            <div className="flex flex-wrap gap-1">
              {questions.map((question) => {
                const mark = topMark(question);
                const ok = mark === question.answerIndex;
                const correctPct = 100 - question.wrongPct;
                return (
                  <span
                    key={question.id}
                    className={`rounded-md px-1.5 py-0.5 text-[11px] ${
                      ok
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-rose-50 text-rose-800"
                    }`}
                  >
                    Q{question.number} ({mark + 1}) {correctPct}%
                  </span>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
