"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flame } from "lucide-react";
import { AnswerReveal, Banner, Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy, useLanguage } from "@/lib/language-context";
import {
  DAILY_SUBJECTS,
  pickMixedQuestions,
  quizMatchesAppLanguage,
  scoreBySubject,
  shuffleQuestionOptions,
  toQuizQuestions,
} from "@/lib/daily-questions";
import { loadDailyQuestions } from "@/lib/daily-questions-db";
import {
  ensureTodayDailyQuiz,
  getCachedDailyQuiz,
  isDailyQuizGenerating,
  onDailyQuizChange,
} from "@/lib/daily-quiz-job";
import { litFires, nextDailyStreak } from "@/lib/growth";
import { localStore } from "@/lib/local-store";
import type { DailyQuestion, DailyQuizAttempt, QuizQuestion } from "@/lib/types";
import { toYmd } from "@/lib/year";

type Stage = "ready" | "playing" | "score";

function todayStamp() {
  return toYmd(new Date());
}

export default function StudentDailyQuizPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("ready");
  const [bank, setBank] = useState<DailyQuestion[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [doneToday, setDoneToday] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [todayQuestions, setTodayQuestions] = useState<QuizQuestion[]>([]);

  function persistAttempt(next: DailyQuizAttempt) {
    localStore.saveDailyQuizAttempt(next);
  }

  function restoreAttempt(attempt: DailyQuizAttempt) {
    setQuestions(attempt.questions);
    setAnswers(attempt.answers);
    setIndex(attempt.index);
    setSelected(attempt.answers[attempt.index] ?? null);
    setRevealed(attempt.revealed);
    setScore(attempt.score);
    setStage(attempt.completed ? "score" : "playing");
    if (attempt.completed) setDoneToday(true);
  }

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const id = window.setTimeout(() => {
      const progress = localStore.getProgress();
      const today = todayStamp();
      const refresh = () => {
        const stored = localStore.getDailyQuizSet();
        const aiSet =
          getCachedDailyQuiz(today, language) ||
          (stored?.date === today && stored.questions.length
            ? stored
            : null);
        setTodayQuestions(aiSet?.questions || []);
        setPreparing(
          !(aiSet && aiSet.questions.length) && isDailyQuizGenerating(),
        );
      };
      refresh();
      unsubscribe = onDailyQuizChange(refresh);
      void ensureTodayDailyQuiz(user, language);
      void loadDailyQuestions().then(setBank);
      setDailyStreak(progress.dailyStreak || 0);
      setLastScore(progress.lastQuizScore);

      const attempt = localStore.getDailyQuizAttempt();
      const finished =
        progress.dailyQuizDate === today ||
        (attempt?.date === today && attempt.completed);
      setDoneToday(finished);

      if (
        attempt?.date === today &&
        quizMatchesAppLanguage(attempt.questions, language)
      ) {
        restoreAttempt(attempt);
        return;
      }
      if (attempt?.date === today) {
        localStore.saveDailyQuizAttempt(null);
      }

      if (finished) {
        const saved = localStore
          .getQuizzes()
          .find((item) => item.createdAt.slice(0, 10) === today);
        if (saved?.questions.length) {
          setQuestions(saved.questions);
          setAnswers(saved.answers || []);
          setScore(saved.score);
          setStage("score");
        }
      }
    }, 0);
    return () => {
      window.clearTimeout(id);
      unsubscribe?.();
    };
  }, [language, user?.id, user?.medium]);

  const lit = litFires(dailyStreak);
  const bankCount = todayQuestions.length || Math.min(6, bank.length);
  const covered = useMemo(() => {
    if (todayQuestions.length) {
      return [
        ...new Set(
          todayQuestions
            .map((question) => question.subject)
            .filter((subject): subject is string => Boolean(subject)),
        ),
      ];
    }
    return [...new Set(bank.map((item) => item.subject))];
  }, [bank, todayQuestions]);
  const current = questions[index];
  const breakdown = useMemo(
    () => (stage === "score" ? scoreBySubject(questions, answers) : []),
    [answers, questions, stage],
  );
  const wrong =
    revealed && selected != null && current
      ? selected !== current.answerIndex
      : false;

  function start() {
    const today = todayStamp();
    if (localStore.getProgress().dailyQuizDate === today) return;
    const existing = localStore.getDailyQuizAttempt();
    if (
      existing?.date === today &&
      quizMatchesAppLanguage(existing.questions, language)
    ) {
      restoreAttempt(existing);
      return;
    }
    if (existing?.date === today) {
      localStore.saveDailyQuizAttempt(null);
    }
    const stored = localStore.getDailyQuizSet();
    const cached =
      getCachedDailyQuiz(today, language) ||
      (stored?.date === today && stored.questions.length ? stored : null);
    const source = cached?.questions || [];
    const next = source
      .filter((question) => question.prompt)
      .map(shuffleQuestionOptions);
    if (!next.length || !quizMatchesAppLanguage(next, language)) {
      void ensureTodayDailyQuiz(user, language);
      return;
    }
    const empty = Array(next.length).fill(null) as (number | null)[];
    setQuestions(next);
    setAnswers(empty);
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setScore(null);
    setStage("playing");
    persistAttempt({
      date: today,
      questions: next,
      answers: empty,
      index: 0,
      revealed: false,
      completed: false,
      score: null,
    });
  }

  function choose(optionIndex: number) {
    if (revealed) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = optionIndex;
    setSelected(optionIndex);
    setAnswers(nextAnswers);
    persistAttempt({
      date: todayStamp(),
      questions,
      answers: nextAnswers,
      index,
      revealed: false,
      completed: false,
      score: null,
    });
  }

  function submitAnswer() {
    if (selected == null || revealed) return;
    setRevealed(true);
    persistAttempt({
      date: todayStamp(),
      questions,
      answers,
      index,
      revealed: true,
      completed: false,
      score: null,
    });
  }

  function nextStep() {
    if (!revealed) return;
    if (index + 1 < questions.length) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setSelected(answers[nextIndex]);
      setRevealed(false);
      persistAttempt({
        date: todayStamp(),
        questions,
        answers,
        index: nextIndex,
        revealed: false,
        completed: false,
        score: null,
      });
      return;
    }
    const correct = questions.filter((q, i) => answers[i] === q.answerIndex)
      .length;
    const percent = Math.round((correct / questions.length) * 100);
    const today = todayStamp();
    const progress = localStore.getProgress();
    localStore.saveQuizzes([
      {
        id: crypto.randomUUID(),
        topic: copy.mixedSubjects,
        questions,
        answers,
        score: percent,
        createdAt: new Date().toISOString(),
        kind: "daily",
      },
      ...localStore.getQuizzes(),
    ]);
    const nextStreak = nextDailyStreak(progress, today);
    localStore.saveProgress({
      ...progress,
      lastQuizScore: percent,
      lastQuizTopic: copy.mixedSubjects,
      dailyQuizDate: today,
      dailyStreak: nextStreak,
    });
    persistAttempt({
      date: today,
      questions,
      answers,
      index,
      revealed: true,
      completed: true,
      score: percent,
    });
    setScore(percent);
    setDailyStreak(nextStreak);
    setDoneToday(true);
    setLastScore(percent);
    setStage("score");
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800"
        >
          <ArrowLeft size={16} />
          {copy.goHome}
        </Link>
        <PageHeader title={copy.dailyQuiz} hint={copy.dailyQuizStudentHint} />
      </div>

      {bankCount === 0 && !preparing && stage === "ready" ? (
        <Banner>{copy.dailyQuizEmptyBank}</Banner>
      ) : null}

      {preparing && stage !== "playing" && todayQuestions.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-teal-700" />
          <p className="text-sm font-medium text-stone-700">
            {copy.dailyQuizPreparing}
          </p>
        </Card>
      ) : null}

      {stage === "ready" && (todayQuestions.length > 0 || !preparing) ? (
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800">
                {copy.dailyStreak}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {doneToday
                  ? `${copy.dailyQuizDone}${lastScore != null ? ` · ${lastScore}%` : ""}`
                  : preparing
                    ? copy.dailyQuizPreparing
                    : copy.dailyQuizHint}
              </p>
              <p className="mt-1 text-xs text-stone-500">{copy.dailyQuizOnce}</p>
            </div>
            <div
              className="flex items-end gap-0.5"
              aria-label={`${copy.dailyStreak}: ${lit} / 3`}
            >
              {[0, 1, 2].map((i) => (
                <Flame
                  key={i}
                  size={i === 1 ? 22 : 18}
                  strokeWidth={2}
                  className={
                    i < lit
                      ? "fill-orange-500 text-orange-500"
                      : "fill-none text-stone-300"
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-stone-500">
              {copy.coveredSubjects}
            </p>
            <div className="flex flex-wrap gap-2">
              {DAILY_SUBJECTS.map((subject) => {
                const on = covered.includes(subject);
                return (
                  <span
                    key={subject}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      on
                        ? "bg-teal-700 text-white"
                        : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {subject}
                  </span>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-stone-600">
            {copy.questionCount.replace(
              "{n}",
              String(Math.min(6, bankCount) || 0),
            )}
          </p>

          {doneToday ? (
            <Link href="/home" className="block">
              <Button type="button" variant="outline" className="w-full">
                {copy.goHome}
              </Button>
            </Link>
          ) : (
            <Button
              className="w-full"
              onClick={start}
              disabled={bankCount === 0 || preparing}
            >
              {copy.startDailyQuiz}
            </Button>
          )}
        </Card>
      ) : null}

      {stage === "playing" && !current ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-teal-700" />
          <p className="text-sm font-medium text-stone-700">
            {copy.dailyQuizPreparing}
          </p>
        </Card>
      ) : null}

      {stage === "playing" && current ? (
        <Card className="space-y-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-teal-700"
              style={{
                width: `${((index + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-teal-800">
              {current.subject}
            </span>
            <p className="text-xs text-stone-500">
              {index + 1} / {questions.length}
            </p>
          </div>
          <h2 className="text-base font-medium">{current.prompt}</h2>
          <div className="space-y-2">
            {current.options.map((option, i) => {
              const chosen = selected === i;
              const isCorrect = i === current.answerIndex;
              let tone = "border-stone-200 bg-white";
              if (!revealed && chosen) tone = "border-teal-800 bg-teal-50";
              if (revealed && isCorrect) {
                tone = "border-emerald-700 bg-emerald-50";
              } else if (revealed && chosen && !isCorrect) {
                tone = "border-rose-600 bg-rose-50";
              }
              return (
                <button
                  key={`${current.id}-${i}`}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={revealed}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm disabled:opacity-100 ${tone}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {revealed ? (
            <AnswerReveal
              wrong={wrong}
              statusLabel={wrong ? copy.wrong : copy.correct}
              correctAnswerLabel={copy.correctAnswer}
              correctOption={current.options[current.answerIndex]}
              explanationLabel={copy.explanation}
              explanation={current.explanation}
            />
          ) : null}
          {selected != null && !revealed ? (
            <Button className="w-full" onClick={submitAnswer}>
              {copy.submitAnswer}
            </Button>
          ) : null}
          {revealed ? (
            <Button className="w-full" onClick={nextStep}>
              {index + 1 === questions.length ? copy.seeScore : copy.nextQuestion}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {stage === "score" && score != null ? (
        <Card className="space-y-4">
          <p className="text-sm text-stone-500">{copy.yourScore}</p>
          <p className="text-4xl font-semibold">{score}%</p>
          <p className="text-sm text-stone-600">{copy.dailyQuizOnce}</p>
          {breakdown.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {copy.subjectScores}
              </p>
              {breakdown.map((row) => (
                <div
                  key={row.subject}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{row.subject}</span>
                  <span className="text-stone-600">
                    {row.correct}/{row.total}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <Link href="/home" className="block">
            <Button type="button" className="w-full">
              {copy.goHome}
            </Button>
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
