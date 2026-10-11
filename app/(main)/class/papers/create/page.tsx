"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PollShareDialog } from "@/components/poll-share-actions";
import {
  Banner,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { DAILY_SUBJECTS } from "@/lib/daily-questions";
import { useCopy, useLanguage } from "@/lib/language-context";
import { saveTeacherPoll } from "@/lib/poll-share";
import type { McqPollQuestion, McqPollSummary, QuizQuestion } from "@/lib/types";
import { sanitizeText } from "@/lib/validate";

const MIN_OPTIONS = 3;
const MAX_OPTIONS = 5;
const MAX_QUESTIONS = 25;
const selectClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700";

function emptyOptions(count: number) {
  return Array.from({ length: count }, () => "");
}

function blankQuestion(optionCount: number, id: string): McqPollQuestion {
  return {
    id,
    prompt: "",
    options: emptyOptions(optionCount),
    answerIndex: 0,
  };
}

function fitOptions(
  options: string[],
  answerIndex: number,
  count: number,
) {
  const next = [...options];
  let mark = answerIndex;
  if (mark >= count && next[mark]) {
    next[count - 1] = next[mark];
    mark = count - 1;
  }
  while (next.length < count) next.push("");
  return {
    options: next.slice(0, count),
    answerIndex: Math.min(Math.max(0, mark), count - 1),
  };
}

function asPollQuestion(
  question: QuizQuestion,
  optionCount: number,
  id: string,
): McqPollQuestion {
  const fitted = fitOptions(question.options, question.answerIndex, optionCount);
  return {
    id,
    prompt: question.prompt,
    options: fitted.options,
    answerIndex: fitted.answerIndex,
  };
}

export default function CreateOwnPaperPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Science");
  const [optionCount, setOptionCount] = useState(4);
  const [draft, setDraft] = useState<McqPollQuestion[]>([
    blankQuestion(4, "q_1"),
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [needs, setNeeds] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<McqPollSummary | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setOrigin(window.location.origin);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function changeOptionCount(nextCount: number) {
    const count = Math.min(MAX_OPTIONS, Math.max(MIN_OPTIONS, nextCount));
    setOptionCount(count);
    setDraft((prev) =>
      prev.map((row) => {
        const fitted = fitOptions(row.options, row.answerIndex, count);
        return { ...row, ...fitted };
      }),
    );
  }

  function updateQuestion(index: number, patch: Partial<McqPollQuestion>) {
    setDraft((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function addNewQuestion() {
    if (draft.length >= MAX_QUESTIONS) return;
    setCreated(null);
    const next = [
      ...draft,
      blankQuestion(optionCount, `q_${draft.length + 1}_${Date.now()}`),
    ];
    setDraft(next);
    setActiveIndex(next.length - 1);
  }

  function removeActive() {
    if (draft.length <= 1) return;
    const next = draft.filter((_, index) => index !== activeIndex);
    setDraft(next);
    setActiveIndex(Math.min(activeIndex, next.length - 1));
  }

  function readyQuestions() {
    return draft
      .map((row) => {
        const options = row.options.map((option) => option.trim());
        return {
          ...row,
          prompt: row.prompt.trim(),
          options,
          answerIndex:
            row.answerIndex >= 0 && row.answerIndex < options.length
              ? row.answerIndex
              : 0,
        };
      })
      .filter(
        (row) =>
          row.prompt &&
          row.options.length >= MIN_OPTIONS &&
          row.options.every(Boolean),
      );
  }

  async function generateOne(index: number) {
    const question = draft[index];
    if (!question) return;
    const need = sanitizeText(needs[question.id] || "", 200);
    if (!need) return;
    setBusyId(question.id);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "paper",
          language,
          topic: `One ${subject} MCQ with exactly ${optionCount} options. Teacher request: ${need}`,
          count: 1,
          subject,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        questions?: QuizQuestion[];
        demo?: boolean;
      } | null;
      const generated = data?.questions?.[0];
      if (!res.ok || !generated) {
        setError(copy.somethingWentWrong);
        return;
      }
      setTitle((prev) => prev || need.slice(0, 80));
      setDraft((prev) =>
        prev.map((row, rowIndex) =>
          rowIndex === index
            ? asPollQuestion(generated, optionCount, row.id)
            : row,
        ),
      );
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setBusyId(null);
    }
  }

  async function publish() {
    const questions = readyQuestions();
    if (!questions.length) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: sanitizeText(title, 120) || "MCQ poll",
          fileName: "own-paper",
          questions,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        poll?: McqPollSummary;
      } | null;
      if (!res.ok || !data?.poll) {
        setError(copy.somethingWentWrong);
        return;
      }
      saveTeacherPoll(data.poll);
      setCreated(data.poll);
      setDraft([blankQuestion(optionCount, "q_1")]);
      setNeeds({});
      setActiveIndex(0);
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setPublishing(false);
    }
  }

  const question = draft[activeIndex] ?? draft[0];
  const generating = Boolean(question && busyId === question.id);
  const canPublish = readyQuestions().length > 0;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link
          href="/class"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800"
        >
          <ArrowLeft size={16} />
          {copy.teacherHome}
        </Link>
        <PageHeader
          title={copy.createOwnPapers}
          hint={copy.teacherCreateOwnHint}
        />
      </div>

      {error ? <Banner>{error}</Banner> : null}

      {created ? (
        <PollShareDialog
          poll={created}
          origin={origin}
          open
          onClose={() => setCreated(null)}
        />
      ) : null}

      <Card className="space-y-4">
        <Field label={copy.paperTitle}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.subject}>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={selectClass}
            >
              {DAILY_SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.answersPerQuestion}>
            <select
              value={optionCount}
              onChange={(event) =>
                changeOptionCount(Number(event.target.value) || 4)
              }
              className={selectClass}
            >
              {Array.from(
                { length: MAX_OPTIONS - MIN_OPTIONS + 1 },
                (_, index) => MIN_OPTIONS + index,
              ).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {question ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {draft.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    index === activeIndex
                      ? "bg-teal-700 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  Q{index + 1}
                </button>
              ))}
            </div>
            {draft.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2"
                onClick={removeActive}
              >
                {copy.removeQuestion}
              </Button>
            ) : null}
          </div>
          <Field label={copy.questionPrompt}>
            <Textarea
              rows={3}
              value={question.prompt}
              onChange={(event) =>
                updateQuestion(activeIndex, { prompt: event.target.value })
              }
            />
          </Field>
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <div
                key={`${question.id}_${optionIndex}`}
                className="flex items-center gap-2"
              >
                <input
                  type="radio"
                  name={`answer-${question.id}`}
                  className="h-4 w-4 accent-teal-700"
                  checked={question.answerIndex === optionIndex}
                  onChange={() =>
                    updateQuestion(activeIndex, { answerIndex: optionIndex })
                  }
                  aria-label={copy.correctAnswer}
                />
                <Input
                  value={option}
                  placeholder={copy.optionLabel.replace(
                    "{n}",
                    String(optionIndex + 1),
                  )}
                  onChange={(event) => {
                    const options = [...question.options];
                    options[optionIndex] = event.target.value;
                    updateQuestion(activeIndex, { options });
                  }}
                />
              </div>
            ))}
            <p className="text-xs text-stone-500">{copy.correctAnswer}</p>
          </div>

          <div className="space-y-2 rounded-xl bg-stone-50 p-3">
            <Field label={copy.questionNeedLabel}>
              <Textarea
                rows={2}
                value={needs[question.id] || ""}
                placeholder={copy.questionNeedPlaceholder}
                onChange={(event) =>
                  setNeeds((prev) => ({
                    ...prev,
                    [question.id]: event.target.value,
                  }))
                }
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              disabled={
                generating || publishing || !(needs[question.id] || "").trim()
              }
              onClick={() => void generateOne(activeIndex)}
            >
              {generating ? copy.generating : copy.generateThisQuestion}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={draft.length >= MAX_QUESTIONS}
            onClick={addNewQuestion}
          >
            {copy.addNextQuestion}
          </Button>
        </Card>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={publishing || !canPublish}
        onClick={() => void publish()}
      >
        {copy.pollMakeLink}
      </Button>
    </div>
  );
}
