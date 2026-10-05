"use client";

import Link from "next/link";
import { useCopy } from "@/lib/language-context";

const TABS = [
  { id: "past" as const, href: "/papers?tab=past", labelKey: "pastPapers" as const },
  { id: "model" as const, href: "/papers?tab=model", labelKey: "modelPapers" as const },
  { id: "own" as const, href: "/papers?tab=own", labelKey: "createOwnPapers" as const },
];

export function HomePaperTabs({
  active,
  onSelect,
}: {
  active?: "past" | "model" | "own";
  onSelect?: (id: "past" | "model" | "own") => void;
}) {
  const copy = useCopy();

  return (
    <div className="grid grid-cols-3 gap-2">
      {TABS.map((tab) => {
        const selected = active === tab.id;
        const className = `flex min-h-[72px] items-center justify-center rounded-2xl border px-2 py-3 text-center text-[11px] font-medium leading-tight ${
          selected
            ? "border-teal-700 bg-teal-700 text-white"
            : "border-stone-200 bg-white text-stone-700 hover:border-teal-700 hover:bg-teal-50"
        }`;
        if (onSelect) {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={className}
            >
              {copy[tab.labelKey]}
            </button>
          );
        }
        return (
          <Link key={tab.id} href={tab.href} className={className}>
            {copy[tab.labelKey]}
          </Link>
        );
      })}
    </div>
  );
}
