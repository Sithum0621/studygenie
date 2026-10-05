"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import {
  classNameOf,
  deleteStudent,
  loadClasses,
  loadStudents,
  upsertStudent,
} from "@/lib/class-room";
import { useCopy } from "@/lib/language-context";
import type { ClassRoom, ClassStudent } from "@/lib/types";
import { isValidEmail, sanitizeText } from "@/lib/validate";

function blank(classId = "") {
  return { id: "", classId, name: "", email: "" };
}

export default function StudentsPage() {
  const copy = useCopy();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [items, setItems] = useState<ClassStudent[]>([]);
  const [form, setForm] = useState(blank());
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const rooms = loadClasses();
      setClasses(rooms);
      setItems(loadStudents());
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
    const name = sanitizeText(form.name, 80);
    const email = form.email.trim().toLowerCase();
    if (!name) {
      setError(copy.invalidName);
      return;
    }
    if (!form.classId) {
      setError(copy.noClassYet);
      return;
    }
    if (email && !isValidEmail(email)) {
      setError(copy.invalidEmail);
      return;
    }
    try {
      const item: ClassStudent = {
        id: form.id || crypto.randomUUID(),
        classId: form.classId,
        name,
        email,
        createdAt: form.id
          ? items.find((row) => row.id === form.id)?.createdAt ||
            new Date().toISOString()
          : new Date().toISOString(),
      };
      setItems(upsertStudent(item));
      setForm(blank(form.classId));
      setSaved(true);
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  function remove(id: string) {
    try {
      deleteStudent(id);
      setItems(loadStudents());
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title={copy.students} hint={copy.studentsHint} />
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
      <PageHeader title={copy.students} hint={copy.studentsHint} />
      <Card className="space-y-4">
        <p className="text-sm font-medium text-stone-800">{copy.addStudent}</p>
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
        <Field label={copy.name}>
          <Input
            maxLength={80}
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label={copy.email}>
          <Input
            type="email"
            maxLength={254}
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Button type="button" className="w-full" onClick={save}>
          {copy.saveStudent}
        </Button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-teal-800">{copy.studentSaved}</p>
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
            {room.name} · {items.filter((row) => row.classId === room.id).length}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-600">{copy.studentsEmpty}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <Card key={item.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-stone-500">
                  {classNameOf(item.classId)}
                  {item.email ? ` · ${item.email}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-2"
                onClick={() => remove(item.id)}
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
