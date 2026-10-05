"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import {
  classNameOf,
  deleteAssignment,
  loadAssignments,
  loadClasses,
  toggleAssignment,
  upsertAssignment,
} from "@/lib/class-room";
import { useCopy } from "@/lib/language-context";
import type { ClassAssignment, ClassRoom } from "@/lib/types";
import { sanitizeMultiline, sanitizeText } from "@/lib/validate";

function blank(classId = "") {
  return { id: "", classId, title: "", details: "", dueDate: "" };
}

export default function AssignmentsPage() {
  const copy = useCopy();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [items, setItems] = useState<ClassAssignment[]>([]);
  const [form, setForm] = useState(blank());
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const rooms = loadClasses();
      setClasses(rooms);
      setItems(loadAssignments());
      setForm(blank(rooms[0]?.id || ""));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const visible = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.classId === filter),
    [filter, items],
  );

  function save() {
    setError(null);
    setSaved(false);
    const title = sanitizeText(form.title, 120);
    if (!title) {
      setError(copy.invalidName);
      return;
    }
    if (!form.classId) {
      setError(copy.noClassYet);
      return;
    }
    try {
      const item: ClassAssignment = {
        id: form.id || crypto.randomUUID(),
        classId: form.classId,
        title,
        details: sanitizeMultiline(form.details, 2000),
        dueDate: form.dueDate,
        done: form.id
          ? items.find((row) => row.id === form.id)?.done || false
          : false,
        createdAt: form.id
          ? items.find((row) => row.id === form.id)?.createdAt ||
            new Date().toISOString()
          : new Date().toISOString(),
      };
      setItems(upsertAssignment(item));
      setForm(blank(form.classId));
      setSaved(true);
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title={copy.assignments} hint={copy.assignmentsHint} />
        <Card className="space-y-3">
          <p className="text-sm text-stone-600">{copy.noClassYet}</p>
          <Link
            href="/class/classes"
            className="inline-flex rounded-xl bg-teal-700 px-4 py-3 text-sm font-medium text-white"
          >
            {copy.addClass}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.assignments} hint={copy.assignmentsHint} />
      <Card className="space-y-4">
        <p className="text-sm font-medium text-stone-800">
          {copy.addAssignment}
        </p>
        <Field label={copy.selectClass}>
          <select
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700"
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
          >
            {classes.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={copy.assignmentTitle}>
          <Input
            maxLength={120}
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label={copy.assignmentDetails}>
          <Textarea
            rows={3}
            maxLength={2000}
            value={form.details}
            onChange={(e) => {
              setForm({ ...form, details: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label={copy.assignmentDue}>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => {
              setForm({ ...form, dueDate: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Button type="button" className="w-full" onClick={save}>
          {copy.saveAssignment}
        </Button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-teal-800">{copy.assignmentSaved}</p>
        ) : null}
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
        {classes.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => setFilter(room.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === room.id
                ? "bg-teal-700 text-white"
                : "bg-white text-stone-700 ring-1 ring-stone-200"
            }`}
          >
            {room.name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-600">{copy.assignmentsEmpty}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <Card key={item.id} className="space-y-2">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setItems(toggleAssignment(item.id))}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs ${
                    item.done
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-stone-300 bg-white"
                  }`}
                  aria-pressed={item.done}
                >
                  {item.done ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-medium ${
                      item.done ? "text-stone-400 line-through" : ""
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-sm text-stone-500">
                    {classNameOf(item.classId)}
                    {item.dueDate ? ` · ${item.dueDate}` : ""}
                  </p>
                  {item.details ? (
                    <p className="mt-1 text-sm text-stone-600">{item.details}</p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2"
                onClick={() => {
                  deleteAssignment(item.id);
                  setItems(loadAssignments());
                }}
              >
                {copy.deleteEvent}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
