"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  AnswerReveal,
  Banner,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy, useLanguage } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import { buildStudentSnapshot } from "@/lib/student-context";
import { matchSubject } from "@/lib/subject-progress";
import { setLastStudySubject } from "@/lib/study-time";
import type { QuizQuestion } from "@/lib/types";
import { sanitizeText } from "@/lib/validate";

export default function QuizPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoAi, setDemoAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const nextTopic = new URLSearchParams(window.location.search).get("topic");
      if (nextTopic) setTopic(nextTopic);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function generate() {
    const topicText = sanitizeText(topic, 200);
    if (!topicText) return;
    setBusy(true);
    setScore(null);
    setSelected(null);
    setIndex(0);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quiz",
          language,
          topic: topicText,
          student: buildStudentSnapshot(user, topicText),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        questions?: QuizQuestion[];
        demo?: boolean;
      } | null;
      if (!res.ok || !data) {
        setError(copy.somethingWentWrong);
        return;
      }
      if (data.demo) setDemoAi(true);
      const qs = data.questions || [];
      setQuestions(qs);
      setAnswers(Array(qs.length).fill(null));
      setLastStudySubject(matchSubject(topicText, user?.subjects ?? []));
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  function choose(optionIndex: number) {
    setSelected(optionIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
  }

  function nextStep() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(answers[index + 1]);
      return;
    }
    const correct = questions.filter((q, i) => answers[i] === q.answerIndex).length;
    const percent = Math.round((correct / questions.length) * 100);
    setScore(percent);
    const quizzes = localStore.getQuizzes();
    localStore.saveQuizzes([
      {
        id: crypto.randomUUID(),
        topic,
        questions,
        answers,
        score: percent,
        createdAt: new Date().toISOString(),
        kind: "practice",
      },
      ...quizzes,
    ]);
    const progress = localStore.getProgress();
    localStore.saveProgress({
      ...progress,
      lastQuizScore: percent,
      lastQuizTopic: topic,
    });
  }

  const current = questions[index];

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
        <PageHeader title={copy.quizTitle} hint={copy.quizHint} />
      </div>
      {demoAi ? <Banner>{copy.mockAiBanner}</Banner> : null}
      {questions.length === 0 || score != null ? (
        <>
          <Field label={copy.topic}>
            <Input maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} />
          </Field>
          <Button className="w-full" onClick={generate} disabled={busy}>
            {busy ? copy.generating : copy.generateQuiz}
          </Button>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {questions.length === 0 ? (
            <p className="text-sm text-stone-500">{copy.quizEmpty}</p>
          ) : null}
        </>
      ) : null}

      {score != null ? (
        <Card className="space-y-3">
          <p className="text-sm text-stone-500">{copy.yourScore}</p>
          <p className="text-4xl font-semibold">{score}%</p>
          <Button
            className="w-full"
            onClick={() => {
              setQuestions([]);
              setScore(null);
            }}
          >
            {copy.newQuiz}
          </Button>
          <Link href="/home" className="block">
            <Button type="button" variant="outline" className="w-full">
              {copy.goHome}
            </Button>
          </Link>
        </Card>
      ) : null}

      {current && score == null ? (
        <Card className="space-y-4">
          <p className="text-xs text-stone-500">
            {index + 1} / {questions.length}
          </p>
          <h2 className="text-base font-medium">{current.prompt}</h2>
          <div className="space-y-2">
            {current.options.map((option, i) => {
              const chosen = selected === i;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => choose(i)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                    chosen
                      ? "border-teal-800 bg-teal-50"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {selected != null ? (
            <AnswerReveal
              wrong={selected !== current.answerIndex}
              statusLabel={
                selected === current.answerIndex ? copy.correct : copy.wrong
              }
              correctAnswerLabel={copy.correctAnswer}
              correctOption={current.options[current.answerIndex]}
              explanationLabel={copy.explanation}
              explanation={current.explanation}
            />
          ) : null}
          <Button className="w-full" onClick={nextStep} disabled={selected == null}>
            {index + 1 === questions.length ? copy.seeScore : copy.nextQuestion}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
