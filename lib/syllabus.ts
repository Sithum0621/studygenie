import raw from "@/data/syllabus/sri-lanka.json";

export type SyllabusUnit = {
  id: string;
  title: string;
  minutes: number;
  topics: string[];
  book?: string;
  pageStart?: number;
  pageEnd?: number;
};

export type SyllabusSubject = {
  id: string;
  name: string;
  units: SyllabusUnit[];
};

export type SyllabusLevel = {
  id: "junior" | "ol" | "al";
  name: string;
  grades: string[];
  subjects: SyllabusSubject[];
};

export type SyllabusMap = {
  country: string;
  name: string;
  note?: string;
  levels: SyllabusLevel[];
};

const syllabus = raw as SyllabusMap;

export function loadSyllabus(): SyllabusMap {
  return syllabus;
}

export function parseSyllabusLevel(_grade?: string): SyllabusLevel["id"] {
  return syllabus.levels[0]?.id || "ol";
}

export function levelOf(_grade?: string) {
  return syllabus.levels[0];
}

export function syllabusSubjects() {
  return levelOf().subjects;
}

export function subjectsFor(_grade?: string, _names?: string[]) {
  return syllabusSubjects();
}

function unitScore(unit: SyllabusUnit, query: string) {
  const hay = `${unit.title} ${unit.topics.join(" ")}`.toLowerCase();
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9\u0d80-\u0dff]+/i)
    .filter((word) => word.length > 2);
  if (!words.length) return 0;
  return words.reduce((score, word) => (hay.includes(word) ? score + 1 : score), 0);
}

export function matchSyllabusUnits(input: {
  grade?: string;
  subjects?: string[];
  query?: string;
  limit?: number;
}) {
  const subjects = subjectsFor(input.grade || "", input.subjects || []);
  const query = (input.query || "").trim();
  const rows = subjects.flatMap((subject) =>
    subject.units.map((unit) => ({
      subject: subject.name,
      unit,
      score: query ? unitScore(unit, query) : 0,
    })),
  );
  const ranked = query
    ? [...rows].sort((a, b) => b.score - a.score).filter((row) => row.score > 0)
    : rows;
  const picked = (ranked.length ? ranked : rows).slice(0, input.limit ?? 8);
  return picked.map((row) => ({
    subject: row.subject,
    id: row.unit.id,
    title: row.unit.title,
    minutes: row.unit.minutes,
    topics: row.unit.topics,
  }));
}

export function formatSyllabusForAi(input: {
  grade?: string;
  subjects?: string[];
  query?: string;
}) {
  const units = matchSyllabusUnits({
    grade: input.grade,
    subjects: input.subjects,
    query: input.query,
    limit: input.query ? 6 : 10,
  });
  const lines = units.map(
    (unit) => `- ${unit.subject} / ${unit.title}: ${unit.topics.join("; ")}`,
  );
  return [
    `Sri Lanka Grade 11 Science textbook lessons only (15 official chapters + පටුන sub-parts):`,
    ...lines,
    "Do not use other grades or subjects. If the question is outside this map, say so briefly, then connect back to the nearest Grade 11 Science unit.",
  ].join("\n");
}

export function guideUnitsFromSyllabus(subjects: string[], grade?: string) {
  return subjectsFor(grade || "", subjects).flatMap((subject) =>
    subject.units.map((unit) => ({
      id: unit.id,
      subject: subject.name,
      title: unit.title,
      estimatedMinutes: unit.minutes,
      topics: unit.topics,
      book: unit.book,
      pageStart: unit.pageStart,
      pageEnd: unit.pageEnd,
    })),
  );
}

export function findSyllabusUnit(unitId: string) {
  for (const subject of syllabusSubjects()) {
    const unit = subject.units.find((row) => row.id === unitId);
    if (unit) return unit;
  }
  return null;
}
