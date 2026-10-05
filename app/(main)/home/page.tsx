"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Layers, MessageCircle, Paperclip, ListChecks, Map } from "lucide-react";
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
    { href: "/flashcards", label: copy.flashcards, icon: Layers },
    { href: "/uploads", label: copy.uploads, icon: Paperclip },
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const id = window.setTimeout(() => {
      const now = new Date();
      const ymd = toYmd(now);
      setToday(ymd);
      setProgress(localStore.touchStreak());
      const refreshMix = () => {
        const aiSet = getCachedDailyQuiz(ymd, language);
        setPreparing(!aiSet && isDailyQuizGenerating());
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
