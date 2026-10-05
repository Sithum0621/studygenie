"use client";

import { useCopy } from "@/lib/language-context";

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const start = polar(cx, cy, r, from);
  const end = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function GrowthSpeedMeter({ value }: { value: number }) {
  const copy = useCopy();
  const speed = Math.min(100, Math.max(0, value));
  const cx = 90;
  const cy = 78;
  const r = 54;
  const angle = (speed / 100) * 180;
  const tip = polar(cx, cy, r - 8, angle);
  const zone =
    speed < 34 ? copy.growthSlow : speed < 67 ? copy.growthSteady : copy.growthFast;

  return (
    <div className="flex h-full w-[168px] flex-col items-center rounded-2xl border border-stone-200 bg-white px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
        {copy.growthSpeed}
      </p>
      <svg
        viewBox="0 0 180 100"
        className="mt-1 h-[100px] w-full"
        role="meter"
        aria-label={copy.growthSpeed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={speed}
      >
        <defs>
          <linearGradient id="growth-fill" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--growth-slow)" />
            <stop offset="55%" stopColor="var(--growth-mid)" />
            <stop offset="100%" stopColor="var(--growth-fast)" />
          </linearGradient>
        </defs>
        <path
          d={arc(cx, cy, r, 0, 180)}
          fill="none"
          stroke="var(--growth-track)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {speed > 0 ? (
          <path
            d={arc(cx, cy, r, 0, Math.max(angle, 2))}
            fill="none"
            stroke="url(#growth-fill)"
            strokeWidth="12"
            strokeLinecap="round"
          />
        ) : null}
        <line
          x1={cx}
          y1={cy}
          x2={tip.x}
          y2={tip.y}
          stroke="var(--growth-needle)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="6" fill="var(--growth-hub)" />
        <circle cx={cx} cy={cy} r="2.5" fill="white" />
        <text
          x="22"
          y="96"
          className="fill-stone-400"
          fontSize="9"
          fontWeight="600"
        >
          {copy.growthSlow}
        </text>
        <text
          x="158"
          y="96"
          textAnchor="end"
          className="fill-stone-400"
          fontSize="9"
          fontWeight="600"
        >
          {copy.growthFast}
        </text>
      </svg>
      <p className="mt-0.5 text-2xl font-semibold leading-none text-stone-900">
        {speed}
      </p>
      <p className="mt-1 text-[11px] font-medium text-stone-600">{zone}</p>
    </div>
  );
}
