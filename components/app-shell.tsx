"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth-context";
import { startDailyQuizBackgroundJob } from "@/lib/daily-quiz-job";
import { useLanguage } from "@/lib/language-context";
import { startStudyTimeTracker } from "@/lib/study-time";
import { useWorkspace } from "@/lib/workspace-context";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center text-sm text-stone-500">
        Loading...
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { workspace } = useWorkspace();
  const wide = pathname.startsWith("/class");
  const showBar = workspace === "studygenie" && !wide;

  useEffect(() => {
    if (!user || workspace !== "studygenie") {
      return;
    }
    return startDailyQuizBackgroundJob(user, language);
  }, [language, user, workspace]);

  useEffect(() => {
    if (!user || workspace !== "studygenie" || pathname.startsWith("/class")) {
      return;
    }
    return startStudyTimeTracker(pathname);
  }, [pathname, user, workspace]);

  return (
    <div
      className={`mx-auto min-h-[calc(100dvh-5rem)] w-full bg-[#f6f3ec] ${
        wide ? "max-w-3xl" : "max-w-lg"
      } ${showBar ? "pb-36" : ""}`}
    >
      <div className="px-4 py-6 pb-8">{children}</div>
      {showBar ? <BottomNav /> : null}
    </div>
  );
}
