"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { HomePaperTabs } from "@/components/home-paper-tabs";
import {
  AnswerReveal,
  Banner,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { DAILY_SUBJECTS } from "@/lib/daily-questions";
import { chartSubjects } from "@/lib/guide-learning";
import { useCopy, useLanguage } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import {
  latestAttemptFor,
  paperSubjects,
  paperYears,
  papersByKind,
  papersMatching,
  saveCustomPaper,
} from "@/lib/papers";
import { buildStudentSnapshot } from "@/lib/student-context";
import { setLastStudySubject } from "@/lib/study-time";
import type { PaperItem, PaperKind, QuizQuestion } from "@/lib/types";
import { sanitizeText } from "@/lib/validate";

type Tab = PaperKind;

export default function PapersPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const subjects = chartSubjects(user?.subjects ?? []);
  const [tab, setTab] = useState<Tab>("past");
  const [papers, setPapers] = useState<PaperItem[]>([]);
  const [active, setActive] = useState<PaperItem | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState(subjects[0] || "Science");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [demoAi, setDemoAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const selectClass =
    "w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700 disabled:bg-stone-50 disabled:text-stone-400";

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(window.location.search).get("tab");
      if (next === "past" || next === "model" || next === "own") setTab(next);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    setPapers(papersByKind(tab));
  }, [tab, tick]);

  const current = active?.questions[index];
  const kindSubjects = useMemo(
    () => (tab === "own" ? [] : paperSubjects(tab)),
    [tab, papers],
  );
  const kindYears = useMemo(
    () => (tab === "own" || !filterSubject ? [] : paperYears(tab, filterSubject)),
    [tab, filterSubject, papers],
  );
  const listed = useMemo(() => {
    if (tab === "own") return papers.filter((item) => item.kind === "own");
    if (!filterSubject || !filterYear) return [];
    return papersMatching(tab, filterSubject, filterYear);
  }, [papers, tab, filterSubject, filterYear]);
  const subjectOptions = [...new Set([...subjects, ...DAILY_SUBJECTS])];
  const wrong =
    revealed && selected != null && current
      ? selected !== current.answerIndex
      : false;

  function selectTab(next: Tab) {
    setTab(next);
    setActive(null);
    setScore(null);
    setRevealed(false);
    setFilterSubject("");
    setFilterYear("");
    window.history.replaceState(null, "", `/papers?tab=${next}`);
  }

  function start(paper: PaperItem) {
    setLastStudySubject(paper.subject);
    setActive(paper);
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setAnswers(Array(paper.questions.length).fill(null));
    setScore(null);
    setStartedAt(Date.now());
  }

  function choose(optionIndex: number) {
    if (revealed) return;
    setSelected(optionIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optionIndex;
      return next;
    });
  }

  function submitAnswer() {
    if (selected == null || revealed) return;
    setRevealed(true);
  }

  function nextStep() {
    if (!active || !revealed) return;
    if (index + 1 < active.questions.length) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setSelected(answers[nextIndex]);
      setRevealed(false);
      return;
    }
    const correct = active.questions.filter(
      (question, i) => answers[i] === question.answerIndex,
    ).length;
    const percent = Math.round((correct / active.questions.length) * 100);
    const timeMinutes = Math.max(0.1, (Date.now() - startedAt) / 60_000);
    localStore.savePaperAttempts([
      {
        id: crypto.randomUUID(),
        paperId: active.id,
        score: percent,
        timeMinutes,
        answers,
        createdAt: new Date().toISOString(),
      },
      ...localStore.getPaperAttempts(),
    ]);
    setScore(percent);
  }

  async function generateOwn() {
    const topicText = sanitizeText(prompt, 200);
    if (!topicText) return;
    setBusy(true);
    setDemoAi(false);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "paper",
          language,
          topic: topicText,
          count,
          subject,
          student: buildStudentSnapshot(user, `${subject} ${topicText}`),
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
      const questions = (data.questions || []).map((question) => ({
        ...question,
        subject: question.subject || subject,
      }));
      if (!questions.length) {
        setError(copy.somethingWentWrong);
        return;
      }
      const paper: PaperItem = {
        id: crypto.randomUUID(),
        kind: "own",
        title: topicText.slice(0, 80),
        subject,
        questions,
        createdAt: new Date().toISOString(),
      };
      saveCustomPaper(paper);
      setTick((value) => value + 1);
      start(paper);
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setBusy(false);
    }
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
        <PageHeader
          title={
            tab === "own"
              ? copy.createOwnPapers
              : tab === "model"
                ? copy.modelPapers
                : copy.pastPapers
          }
          hint={tab === "own" ? copy.createOwnHint : copy.pickSubjectYear}
        />
      </div>

      <HomePaperTabs active={tab} onSelect={selectTab} />

      {demoAi ? <Banner>{copy.mockAiBanner}</Banner> : null}

      {active && score == null && current ? (
        <Card className="space-y-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-teal-700"
              style={{
                width: `${((index + 1) / active.questions.length) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-teal-800">
              {current.subject || active.subject}
            </span>
            <p className="text-xs text-stone-500">
              {index + 1} / {active.questions.length}
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
              {index + 1 === active.questions.length
                ? copy.seeScore
                : copy.nextQuestion}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {active && score != null ? (
        <Card className="space-y-3">
          <p className="text-sm text-stone-500">{copy.yourScore}</p>
          <p className="text-4xl font-semibold">{score}%</p>
          <Link
            href="/home"
            className="inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-medium text-white"
          >
            {copy.goHome}
          </Link>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setActive(null);
              setScore(null);
              setRevealed(false);
            }}
          >
            {tab === "own"
              ? copy.createOwnPapers
              : tab === "model"
                ? copy.modelPapers
                : copy.pastPapers}
          </Button>
        </Card>
      ) : null}

      {!active && tab !== "own" ? (
        <Card className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.subject}>
            <select
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setFilterYear("");
              }}
              className={selectClass}
            >
              <option value="">{copy.selectSubject}</option>
              {kindSubjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.paperYear}>
            <select
              value={filterYear}
              disabled={!filterSubject}
              onChange={(e) => setFilterYear(e.target.value)}
              className={selectClass}
            >
              <option value="">{copy.selectYear}</option>
              {kindYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </Field>
        </Card>
      ) : null}

      {!active && tab === "own" ? (
        <Card className="space-y-4">
          <Field label={copy.ownPaperPrompt}>
            <Textarea
              rows={3}
              value={prompt}
              placeholder={copy.createOwnPlaceholder}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Field>
          <Field label={copy.subject}>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={selectClass}
            >
              {subjectOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.paperQuestionCount}>
            <Input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) =>
                setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
              }
            />
          </Field>
          <Button className="w-full" onClick={generateOwn} disabled={busy}>
            {busy ? copy.generating : copy.generatePaper}
          </Button>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </Card>
      ) : null}

      {!active ? (
        <div className="space-y-3">
          {tab !== "own" && (!filterSubject || !filterYear) ? (
            <p className="text-sm text-stone-500">{copy.pickSubjectYear}</p>
          ) : listed.length === 0 && tab !== "own" ? (
            <p className="text-sm text-stone-500">{copy.noPapers}</p>
          ) : (
            listed.map((paper) => {
              const last = latestAttemptFor(paper.id);
              return (
                <Card key={paper.id} className="space-y-3">
                  <div>
                    <p className="font-medium">{paper.title}</p>
                    <p className="text-sm text-stone-500">
                      {paper.subject}
                      {paper.year ? ` · ${paper.year}` : ""}
                      {` · ${copy.questionCount.replace("{n}", String(paper.questions.length))}`}
                      {last
                        ? ` · ${copy.lastPaperScore.replace("{n}", String(last.score))}`
                        : ""}
                    </p>
                  </div>
                  <Button className="w-full" onClick={() => start(paper)}>
                    {copy.startPaper}
                  </Button>
                </Card>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
