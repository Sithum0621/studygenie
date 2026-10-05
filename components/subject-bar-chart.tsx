"use client";

import { useCopy } from "@/lib/language-context";
import type { SubjectBarRow } from "@/lib/subject-progress";

export function SubjectBarChart({ rows }: { rows: SubjectBarRow[] }) {
  const copy = useCopy();
  const width = 320;
  const height = 176;
  const padL = 28;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const groupW = rows.length ? plotW / rows.length : plotW;
  const barW = Math.min(10, groupW * 0.28);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800">
          {copy.subjectTimeChart}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-stone-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-teal-700" />
            {copy.chartScore}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-500" />
            {copy.chartTime}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[168px] w-full">
        {[0, 50, 100].map((tick) => {
          const y = padT + plotH - (tick / 100) * plotH;
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#e7e5e4"
                strokeWidth="1"
              />
              <text
                x={padL - 4}
                y={y + 3}
                textAnchor="end"
                className="fill-stone-400"
                fontSize="8"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {rows.map((row, index) => {
          const cx = padL + groupW * index + groupW / 2;
          const scoreH = (row.score / 100) * plotH;
          const timeH = (row.time / 100) * plotH;
          const label =
            row.subject.length > 7 ? row.subject.slice(0, 6) : row.subject;
          return (
            <g key={row.subject}>
              <rect
                x={cx - barW - 2}
                y={padT + plotH - Math.max(scoreH, 1)}
                width={barW}
                height={Math.max(scoreH, 1)}
                rx="2"
                fill="#0f766e"
              />
              <rect
                x={cx + 2}
                y={padT + plotH - Math.max(timeH, 1)}
                width={barW}
                height={Math.max(timeH, 1)}
                rx="2"
                fill="#f59e0b"
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                className="fill-stone-500"
                fontSize="8"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[11px] text-stone-500">{copy.noSubjectData}</p>
    </div>
  );
}
