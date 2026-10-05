"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import {
  deleteClass,
  loadAssignments,
  loadClasses,
  loadStudents,
  upsertClass,
} from "@/lib/class-room";
import { DAILY_SUBJECTS } from "@/lib/daily-questions";
import { useCopy } from "@/lib/language-context";
import type { ClassRoom } from "@/lib/types";
import { sanitizeText } from "@/lib/validate";

function blank(): Omit<ClassRoom, "id" | "createdAt"> & { id: string } {
  return { id: "", name: "", grade: "", subject: DAILY_SUBJECTS[0] };
}

export default function ClassesPage() {
  const copy = useCopy();
  const [items, setItems] = useState<ClassRoom[]>([]);
  const [form, setForm] = useState(blank());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setItems(loadClasses()), 0);
    return () => window.clearTimeout(id);
  }, []);

  function save() {
    setError(null);
    setSaved(false);
    const name = sanitizeText(form.name, 80);
    if (!name) {
      setError(copy.invalidName);
      return;
    }
    try {
      const item: ClassRoom = {
        id: form.id || crypto.randomUUID(),
        name,
        grade: sanitizeText(form.grade, 40),
        subject: sanitizeText(form.subject, 40) || DAILY_SUBJECTS[0],
        createdAt: form.id
          ? items.find((row) => row.id === form.id)?.createdAt ||
            new Date().toISOString()
          : new Date().toISOString(),
      };
      setItems(upsertClass(item));
      setForm(blank());
      setSaved(true);
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  function remove(id: string) {
    try {
      deleteClass(id);
      setItems(loadClasses());
      if (form.id === id) setForm(blank());
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.classes} hint={copy.classesHint} />
      <Card className="space-y-4">
        <p className="text-sm font-medium text-stone-800">
          {form.id ? copy.editClass : copy.addClass}
        </p>
        <Field label={copy.className}>
          <Input
            maxLength={80}
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label={copy.grade}>
          <Input
            maxLength={40}
            placeholder="O/L, A/L, Grade 10..."
            value={form.grade}
            onChange={(e) => {
              setForm({ ...form, grade: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label={copy.subject}>
          <select
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          >
            {DAILY_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="px-3 py-2" onClick={save}>
            {copy.saveClass}
          </Button>
          {form.id ? (
            <Button
              type="button"
              variant="outline"
              className="px-3 py-2"
              onClick={() => setForm(blank())}
            >
              {copy.cancel}
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {saved ? <p className="text-sm text-teal-800">{copy.classSaved}</p> : null}
      </Card>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-600">{copy.classesEmpty}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="space-y-2">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-stone-500">
                {item.subject}
                {item.grade ? ` · ${item.grade}` : ""}
                {` · ${loadStudents(item.id).length} ${copy.students}`}
                {` · ${loadAssignments(item.id).length} ${copy.assignments}`}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2"
                  onClick={() =>
                    setForm({
                      id: item.id,
                      name: item.name,
                      grade: item.grade,
                      subject: item.subject,
                    })
                  }
                >
                  {copy.editClass}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-2"
                  onClick={() => remove(item.id)}
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
