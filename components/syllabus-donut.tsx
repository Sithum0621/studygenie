"use client";

import Link from "next/link";
import { useCopy } from "@/lib/language-context";
import { formatStudyMinutes } from "@/lib/study-time";

export function SyllabusDonut({
  percent,
  done,
  total,
  wastedMinutes,
}: {
  percent: number;
  done: number;
  total: number;
  wastedMinutes: number;
}) {
  const copy = useCopy();
  const r = 42;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const dash = (clamped / 100) * c;
  const wasted = formatStudyMinutes(
    wastedMinutes,
    copy.hoursAbbrev,
    copy.minutesAbbrev,
  );

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800">
        {copy.syllabusDone}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-[120px] w-[120px] shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#e7e5e4"
              strokeWidth="12"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#0f766e"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold leading-none text-stone-900">
              {clamped}%
            </p>
            <p className="mt-1 text-[10px] text-stone-500">
              {done}/{total}
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1 rounded-xl bg-stone-50 px-3 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
            {copy.wastedTime}
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none text-stone-900">
            {wasted}
          </p>
          <Link
            href="/guide"
            className="mt-3 inline-block text-xs font-medium text-teal-800"
          >
            {copy.openGuide}
          </Link>
        </div>
      </div>
    </div>
  );
}
