import { localStore } from "./local-store";
import { guideUnitsFromSyllabus, syllabusSubjects } from "./syllabus";
import type { GuideUnit } from "./types";

function seedUnits(): GuideUnit[] {
  return guideUnitsFromSyllabus(["Science"], "Grade 11").map((unit) => ({
    id: unit.id,
    subject: unit.subject,
    title: unit.title,
    estimatedMinutes: unit.estimatedMinutes,
    doneAt: null,
  }));
}

export function chartSubjects(_profileSubjects?: string[]) {
  const names = syllabusSubjects().map((subject) => subject.name);
  return names.length ? names : ["Science"];
}

export function loadGuideUnits(
  _profileSubjects?: string[],
  _grade?: string,
) {
  const stored = localStore.getGuideUnits();
  const byId = new Map(stored.map((unit) => [unit.id, unit]));
  const next = seedUnits().map((seed) => {
    const existing = byId.get(seed.id);
    return existing ? { ...seed, doneAt: existing.doneAt } : seed;
  });

  localStore.saveGuideUnits(next);
  return next;
}

export function toggleGuideUnit(
  id: string,
  profileSubjects: string[],
  grade?: string,
) {
  const units = loadGuideUnits(profileSubjects, grade).map((unit) =>
    unit.id === id
      ? { ...unit, doneAt: unit.doneAt ? null : new Date().toISOString() }
      : unit,
  );
  localStore.saveGuideUnits(units);
  return units;
}

export function syllabusProgress(units: GuideUnit[]) {
  const total = units.length;
  const done = units.filter((unit) => unit.doneAt).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
}
