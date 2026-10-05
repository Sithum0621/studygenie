"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { useCopy } from "@/lib/language-context";
import { DAILY_SUBJECTS } from "@/lib/daily-questions";
import {
  deleteDailyQuestion,
  loadDailyQuestions,
  upsertDailyQuestion,
} from "@/lib/daily-questions-db";
import type { DailyQuestion } from "@/lib/types";

const EMPTY_OPTIONS = ["", "", "", ""];

function blankForm(subject = DAILY_SUBJECTS[0]) {
  return {
    id: "",
    subject,
    prompt: "",
    options: [...EMPTY_OPTIONS],
    answerIndex: 0,
    explanation: "",
  };
}

export default function DailyQuestionsPage() {
  const copy = useCopy();
  const [items, setItems] = useState<DailyQuestion[]>([]);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(blankForm());

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadDailyQuestions().then(setItems);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const visible = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.subject === filter),
    [filter, items],
  );

  async function save() {
    const prompt = form.prompt.trim();
    const options = form.options.map((option) => option.trim());
    if (!prompt || options.some((option) => !option)) return;

    try {
      const saved = await upsertDailyQuestion({
        id: form.id || crypto.randomUUID(),
        subject: form.subject,
        prompt: prompt.slice(0, 500),
        options: options.map((option) => option.slice(0, 200)),
        answerIndex: form.answerIndex,
        explanation: form.explanation.trim().slice(0, 500),
        createdAt: form.id
          ? items.find((item) => item.id === form.id)?.createdAt ||
            new Date().toISOString()
          : new Date().toISOString(),
      });

      setItems((prev) =>
        form.id
          ? prev.map((item) => (item.id === form.id ? saved : item))
          : [saved, ...prev],
      );
      setForm(blankForm(form.subject));
    } catch {
      return;
    }
  }

  async function remove(id: string) {
    await deleteDailyQuestion(id);
    setItems((prev) => prev.filter((row) => row.id !== id));
  }

  function edit(item: DailyQuestion) {
    setForm({
      id: item.id,
      subject: item.subject,
      prompt: item.prompt,
      options: [...item.options, "", "", "", ""].slice(0, 4),
      answerIndex: item.answerIndex,
      explanation: item.explanation,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={copy.dailyQuestions}
        hint={copy.dailyQuestionsHint}
      />

      <Card className="space-y-4">
        <p className="text-sm font-medium text-stone-800">
          {form.id ? copy.editQuestion : copy.addDailyQuestion}
        </p>
        <Field label={copy.subject}>
          <select
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700"
            value={form.subject}
            onChange={(event) =>
              setForm({ ...form, subject: event.target.value })
            }
          >
            {DAILY_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.questionPrompt}>
          <Textarea
            rows={3}
            value={form.prompt}
            onChange={(event) =>
              setForm({ ...form, prompt: event.target.value })
            }
          />
        </Field>
        <div className="space-y-3">
          {form.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="daily-answer"
                className="h-4 w-4 accent-teal-700"
                checked={form.answerIndex === index}
                onChange={() => setForm({ ...form, answerIndex: index })}
                aria-label={copy.correctAnswer}
              />
              <Input
                className="py-2"
                placeholder={copy.optionLabel.replace("{n}", String(index + 1))}
                value={option}
                onChange={(event) => {
                  const options = [...form.options];
                  options[index] = event.target.value;
                  setForm({ ...form, options });
                }}
              />
            </div>
          ))}
          <p className="text-xs text-stone-500">{copy.correctAnswer}</p>
        </div>
        <Field label={copy.explanation}>
          <Input
            className="py-2"
            value={form.explanation}
            onChange={(event) =>
              setForm({ ...form, explanation: event.target.value })
            }
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save} className="px-3 py-2">
            {copy.saveQuestion}
          </Button>
          {form.id ? (
            <Button
              type="button"
              variant="outline"
              className="px-3 py-2"
              onClick={() => setForm(blankForm(form.subject))}
            >
              {copy.cancel}
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            filter === "all"
              ? "bg-teal-700 text-white"
              : "bg-white text-stone-700 ring-1 ring-stone-200"
          }`}
        >
          {copy.allSubjects}
        </button>
        {DAILY_SUBJECTS.map((subject) => {
          const count = items.filter((item) => item.subject === subject).length;
          return (
            <button
              key={subject}
              type="button"
              onClick={() => setFilter(subject)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === subject
                  ? "bg-teal-700 text-white"
                  : "bg-white text-stone-700 ring-1 ring-stone-200"
              }`}
            >
              {subject} · {count}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-600">{copy.dailyQuestionsEmpty}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <Card key={item.id} className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-teal-800">
                {item.subject}
              </p>
              <p className="text-sm font-medium text-stone-900">{item.prompt}</p>
              <ul className="space-y-1 text-sm text-stone-600">
                {item.options.map((option, index) => (
                  <li key={`${item.id}-${index}`}>
                    {index === item.answerIndex ? "● " : "○ "}
                    {option}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2"
                  onClick={() => edit(item)}
                >
                  {copy.editQuestion}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-2"
                  onClick={() => void remove(item.id)}
                >
                  {copy.deleteEvent}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
