"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Home, ListTodo, Sparkles, UserRound } from "lucide-react";
import { useCopy } from "@/lib/language-context";

const ITEMS = [
  { href: "/home", labelKey: "navHome" as const, icon: Home },
  { href: "/tasks", labelKey: "navTasks" as const, icon: ListTodo },
  { href: "/study", labelKey: "navStudy" as const, icon: Sparkles, special: true },
  { href: "/game", labelKey: "navGame" as const, icon: Gamepad2 },
  { href: "/bio", labelKey: "navBio" as const, icon: UserRound },
];

export function BottomNav() {
  const copy = useCopy();
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      aria-label="Main"
    >
      <div className="pointer-events-auto mx-auto max-w-lg">
        <div className="relative overflow-visible border-t border-stone-200 bg-white/95 px-1 pt-5 shadow-[0_-8px_24px_rgb(28_25_23/0.08)] backdrop-blur-md pb-[max(0.55rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-5 items-end">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              if (item.special) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="relative flex h-[58px] flex-col items-center justify-end"
                  >
                    <span
                      className={`study-orb absolute -top-7 flex h-16 w-16 items-center justify-center rounded-full text-white ${
                        active ? "study-orb-active bg-teal-800" : "bg-teal-700"
                      }`}
                    >
                      <span className="study-ring" aria-hidden />
                      <Icon size={26} strokeWidth={2.2} />
                    </span>
                    <span
                      className={`pb-0.5 text-[10px] font-medium ${
                        active ? "text-teal-800" : "text-stone-500"
                      }`}
                    >
                      {copy[item.labelKey]}
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-[58px] flex-col items-center justify-center gap-1 ${
                    active ? "text-teal-800" : "text-stone-500"
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.3 : 2} />
                  <span className="text-[10px] font-medium">
                    {copy[item.labelKey]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
