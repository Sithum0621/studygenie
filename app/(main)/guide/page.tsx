"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  loadGuideUnits,
  syllabusProgress,
  toggleGuideUnit,
} from "@/lib/guide-learning";
import { guideUnitsFromSyllabus } from "@/lib/syllabus";
import { useCopy } from "@/lib/language-context";
import { setLastStudySubject } from "@/lib/study-time";
import type { GuideUnit } from "@/lib/types";

export default function GuideLearningPage() {
  const copy = useCopy();
  const { user } = useAuth();
  const subjects = user?.subjects ?? [];
  const [units, setUnits] = useState<GuideUnit[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = loadGuideUnits(subjects, user?.grade);
      setUnits(next);
      setOpen(next[0]?.subject ?? null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [subjects]);

  const topicsById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const unit of guideUnitsFromSyllabus(subjects, user?.grade)) {
      map.set(unit.id, unit.topics);
    }
    return map;
  }, [subjects, user?.grade]);

  const grouped = useMemo(() => {
    const map = new Map<string, GuideUnit[]>();
    for (const unit of units) {
      const list = map.get(unit.subject) ?? [];
      list.push(unit);
      map.set(unit.subject, list);
    }
    return [...map.entries()];
  }, [units]);

  const progress = syllabusProgress(units);

  function toggle(unit: GuideUnit) {
    setLastStudySubject(unit.subject);
    setUnits(toggleGuideUnit(unit.id, subjects, user?.grade));
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
        <PageHeader title={copy.guideLearning} hint={copy.guideLearningHint} />
      </div>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
            {copy.syllabusDone}
          </p>
          <p className="mt-1 text-2xl font-semibold">{progress.percent}%</p>
        </div>
        <p className="text-sm text-stone-600">
          {progress.done}/{progress.total}
        </p>
      </Card>

      {grouped.map(([subject, list]) => {
        const done = list.filter((unit) => unit.doneAt).length;
        const expanded = open === subject;
        return (
          <Card key={subject} className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => {
                setOpen(expanded ? null : subject);
                setLastStudySubject(subject);
              }}
            >
              <span className="text-sm font-medium">{subject}</span>
              <span className="text-xs text-stone-500">
                {done}/{list.length}
              </span>
            </button>
            {expanded ? (
              <div className="space-y-2">
                {list.map((unit) => {
                  const doneUnit = Boolean(unit.doneAt);
                  return (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{unit.title}</p>
                        <p className="text-[11px] text-stone-500">
                          {copy.estimatedMin.replace(
                            "{n}",
                            String(unit.estimatedMinutes),
                          )}
                        </p>
                        {topicsById.get(unit.id)?.length ? (
                          <p className="mt-1 text-[11px] text-stone-500">
                            {topicsById.get(unit.id)?.join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant={doneUnit ? "outline" : "primary"}
                        className="shrink-0 px-3 py-2"
                        onClick={() => toggle(unit)}
                      >
                        {doneUnit ? (
                          <span className="inline-flex items-center gap-1">
                            <Check size={14} />
                            {copy.undoDone}
                          </span>
                        ) : (
                          copy.markDone
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
