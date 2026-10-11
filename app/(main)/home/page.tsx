"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, MessageCircle, ListChecks, Map } from "lucide-react";
import { DailyQuizTab } from "@/components/daily-quiz-tab";
import { GrowthSpeedMeter } from "@/components/growth-speed-meter";
import { HomeInsightSlider } from "@/components/home-insight-slider";
import { HomePaperTabs } from "@/components/home-paper-tabs";
import { Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy, useLanguage } from "@/lib/language-context";
import { quizSubjectSummary, subjectSummary } from "@/lib/daily-questions";
import { loadDailyQuestions } from "@/lib/daily-questions-db";
import {
  getCachedDailyQuiz,
  isDailyQuizGenerating,
  isDailyQuizWaitingOnline,
  onDailyQuizChange,
} from "@/lib/daily-quiz-job";
import { growthSpeed } from "@/lib/growth";
import { localStore } from "@/lib/local-store";
import type { ProgressState } from "@/lib/types";
import { toYmd } from "@/lib/year";

export default function HomePage() {
  const { user } = useAuth();
  const copy = useCopy();
  const { language } = useLanguage();
  const actions = [
    { href: "/guide", label: copy.guideLearning, icon: Map },
    { href: "/tutor", label: copy.tutor, icon: MessageCircle },
    { href: "/notes", label: copy.notes, icon: BookOpen },
    { href: "/quiz", label: copy.quiz, icon: ListChecks },
  ];
  const [progress, setProgress] = useState<ProgressState>({
    streak: 0,
    lastActiveDate: null,
    lastQuizScore: null,
    lastQuizTopic: null,
    dailyQuizDate: null,
    dailyStreak: 0,
  });
  const [today, setToday] = useState("2026-01-01");
  const [mixLabel, setMixLabel] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [waitingOnline, setWaitingOnline] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const id = window.setTimeout(() => {
      setProgress(localStore.touchStreak());
      const refreshMix = () => {
        const ymd = toYmd(new Date());
        setToday(ymd);
        const aiSet = getCachedDailyQuiz(ymd, language);
        const waiting = !aiSet && isDailyQuizWaitingOnline();
        setWaitingOnline(waiting);
        setPreparing(!aiSet && (isDailyQuizGenerating() || waiting));
        if (aiSet) {
          setMixLabel(quizSubjectSummary(aiSet.questions));
          return;
        }
        void loadDailyQuestions().then((items) => {
          if (!getCachedDailyQuiz(toYmd(new Date()), language, user?.medium)) {
            setMixLabel(subjectSummary(items));
          }
        });
      };
      refreshMix();
      unsubscribe = onDailyQuizChange(refreshMix);
    }, 0);
    return () => {
      window.clearTimeout(id);
      unsubscribe?.();
    };
  }, [language, user?.medium]);

  const topic = mixLabel || copy.mixedSubjects;
  const done = progress.dailyQuizDate === today;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${copy.homeHello}, ${user?.name || "student"}`}
        hint={copy.continueLearning}
      />
      <div className="grid grid-cols-[1fr_auto] items-stretch gap-3">
        <DailyQuizTab
          topic={topic}
          done={done}
          score={done ? progress.lastQuizScore : null}
          dailyStreak={progress.dailyStreak ?? 0}
          preparing={preparing}
          waitingOnline={waitingOnline}
        />
        <GrowthSpeedMeter value={growthSpeed(progress, today)} />
      </div>
      <HomeInsightSlider
        subjects={user?.subjects ?? []}
        grade={user?.grade}
      />
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-stone-700">{copy.quickActions}</h2>
        <HomePaperTabs />
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="flex items-center gap-3">
                  <Icon size={18} className="text-teal-800" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
