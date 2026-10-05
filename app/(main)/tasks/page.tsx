"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banner, Button, Card, PageHeader, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy, useLanguage } from "@/lib/language-context";
import { buildStudentSnapshot } from "@/lib/student-context";
import {
  applyActivityDone,
  loadTaskPlan,
  mergeDone,
  saveTaskPlan,
  togglePlanTask,
} from "@/lib/tasks";
import { toYmd } from "@/lib/year";
import type { StudyTask } from "@/lib/types";

export default function TasksPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [coach, setCoach] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoAi, setDemoAi] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const today = toYmd(new Date());
      setDate(today);
      const plan = loadTaskPlan();
      if (
        plan &&
        plan.date === today &&
        plan.language === language &&
        plan.tasks.length > 0
      ) {
        const next = applyActivityDone(plan.tasks, today);
        saveTaskPlan({ ...plan, tasks: next });
        setTasks(next);
        setCoach(plan.note || "");
        setDemoAi(plan.demo);
        return;
      }
      void loadFromAi(today, "");
    }, 0);
    return () => window.clearTimeout(id);
  }, [language, user?.id]);

  async function loadFromAi(today: string, changeNote: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          date: today,
          note: changeNote,
          student: buildStudentSnapshot(user, changeNote),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        tasks?: StudyTask[];
        note?: string;
        demo?: boolean;
      } | null;
      if (!res.ok || !data) {
        setError(copy.somethingWentWrong);
        return;
      }
      const previous = loadTaskPlan()?.date === today ? loadTaskPlan()?.tasks || [] : [];
      const merged = applyActivityDone(
        mergeDone(data.tasks || [], previous),
        today,
      );
      saveTaskPlan({
        date: today,
        language,
        tasks: merged,
        note: data.note || "",
        generatedAt: new Date().toISOString(),
        demo: Boolean(data.demo),
      });
      setDemoAi(Boolean(data.demo));
      setTasks(merged);
      setCoach(data.note || "");
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setTasks(togglePlanTask(id));
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.tasksTitle} hint={copy.tasksHint} />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {demoAi ? <Banner>{copy.mockAiBanner}</Banner> : null}
      {coach ? <p className="text-sm text-stone-600">{coach}</p> : null}
      {busy && tasks.length === 0 ? (
        <p className="text-sm text-stone-500">{copy.tasksPreparing}</p>
      ) : null}
      {tasks.length === 0 && !busy ? (
        <p className="text-sm text-stone-500">{copy.noTasks}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggle(task.id)}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs ${
                  task.done
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-stone-300 bg-white"
                }`}
                aria-pressed={task.done}
              >
                {task.done ? "✓" : ""}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    task.done ? "text-stone-400 line-through" : ""
                  }`}
                >
                  {task.title}
                </p>
                <p className="text-xs text-stone-500">
                  {task.subject}
                  {task.topic ? ` · ${task.topic}` : ""}
                </p>
                {task.why ? (
                  <p className="mt-1 text-xs text-stone-500">{task.why}</p>
                ) : null}
              </div>
              {task.href ? (
                <Link
                  href={task.href}
                  className="shrink-0 rounded-lg border border-stone-200 px-2 py-1 text-xs text-teal-800 hover:bg-teal-50"
                >
                  {copy.openTask}
                </Link>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      <Card className="space-y-3">
        <p className="text-sm font-medium text-stone-700">{copy.changeTasks}</p>
        <p className="text-xs text-stone-500">{copy.taskChangeHint}</p>
        <Textarea
          rows={3}
          value={note}
          placeholder={copy.taskChangePlaceholder}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={busy || !note.trim() || !date}
          onClick={() => {
            const text = note.trim();
            setNote("");
            void loadFromAi(date, text);
          }}
        >
          {copy.changeTasks}
        </Button>
      </Card>
    </div>
  );
}
