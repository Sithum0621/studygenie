"use client";

import { useCopy } from "@/lib/language-context";
import type { PollQuestionStat } from "@/lib/types";

export function PollQuestionDetail({
  question,
  tone = "neutral",
}: {
  question: PollQuestionStat;
  tone?: "neutral" | "wrong" | "correct";
}) {
  const copy = useCopy();
  const box =
    tone === "wrong"
      ? "border-rose-100 bg-rose-50"
      : tone === "correct"
        ? "border-emerald-100 bg-emerald-50"
        : "border-stone-200 bg-stone-50";
  return (
    <div className={`space-y-2 rounded-xl border px-3 py-3 ${box}`}>
      <p className="text-sm font-medium text-stone-900">
        Q{question.number}
        <span className="ml-2 font-normal text-stone-700">{question.prompt}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {question.counts.map((count, index) => {
          const correct = index === question.answerIndex;
          const pct = question.answered
            ? Math.round((count / question.answered) * 100)
            : 0;
          return (
            <span
              key={`${question.id}_${index}`}
              className={`rounded-md px-2 py-1 text-[11px] ${
                correct
                  ? "bg-emerald-50 font-medium text-emerald-800"
                  : "bg-white text-stone-600"
              }`}
            >
              ({index + 1}) {pct}%
              {correct ? ` · ${copy.pollCorrectMark}` : ""}
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-stone-500">
        {copy.pollWrongPct.replace("{n}", String(question.wrongPct))}
        {" · "}
        {copy.pollCorrectPct.replace("{n}", String(100 - question.wrongPct))}
      </p>
    </div>
  );
}
