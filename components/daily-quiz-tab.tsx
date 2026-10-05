"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { useCopy } from "@/lib/language-context";
import { litFires } from "@/lib/growth";

export function DailyQuizTab({
  topic,
  done,
  score,
  dailyStreak,
  preparing = false,
}: {
  topic: string;
  done: boolean;
  score: number | null;
  dailyStreak: number;
  preparing?: boolean;
}) {
  const copy = useCopy();
  const lit = litFires(dailyStreak);

  return (
    <Link
      href="/daily-questions"
      className="flex min-h-[148px] flex-1 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800">
            {copy.dailyQuiz}
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-900">{topic}</p>
          <p className="mt-1 text-xs text-stone-500">
            {done ? copy.dailyQuizOnce : copy.dailyQuizHint}
          </p>
        </div>
        <div
          className="flex items-end gap-0.5"
          aria-label={`${copy.dailyStreak}: ${lit} / 3`}
        >
          {[0, 1, 2].map((index) => {
            const on = index < lit;
            return (
              <Flame
                key={index}
                size={index === 1 ? 22 : 18}
                strokeWidth={2}
                className={
                  on
                    ? "fill-orange-500 text-orange-500"
                    : "fill-none text-stone-300"
                }
              />
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        {done ? (
          <p className="text-sm text-stone-600">
            {copy.dailyQuizDone}
            {score != null ? ` · ${score}%` : ""}
          </p>
        ) : preparing ? (
          <p className="text-sm text-stone-600">{copy.dailyQuizPreparing}</p>
        ) : (
          <span className="inline-flex rounded-xl bg-teal-700 px-3 py-2 text-sm font-medium text-white">
            {copy.startDailyQuiz}
          </span>
        )}
      </div>
    </Link>
  );
}
