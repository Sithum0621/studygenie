import catalog from "@/data/guided-learning/catalog.json";
import type { CurriculumTopic, StudentLearningState, TopicKnowledge } from "./types";

type RawKnowledge = {
  cleaned_content: string;
  teacher_activities: string;
  key_terms: string[];
  summary_points: string[];
  analogies: string[];
  checkpoint: string;
  checkpoint_ok: string[];
};

type RawTopic = {
  id: string;
  topic_no: string;
  topic_title: string;
  order_index: number;
  knowledge: RawKnowledge;
};

type RawUnit = {
  grade: number;
  subject: string;
  unit_no: number;
  unit_id: string;
  unit_title: string;
  topics: RawTopic[];
};

type RawCatalog = {
  units: RawUnit[];
};

function mapKnowledge(raw: RawKnowledge): TopicKnowledge {
  return {
    cleanedContent: raw.cleaned_content,
    teacherActivities: raw.teacher_activities,
    keyTerms: raw.key_terms,
    summaryPoints: raw.summary_points,
    analogies: raw.analogies,
    checkpoint: raw.checkpoint,
    checkpointOk: raw.checkpoint_ok,
  };
}

function mapUnit(raw: RawUnit): CurriculumTopic[] {
  return raw.topics.map((topic) => ({
    id: topic.id,
    grade: raw.grade,
    subject: raw.subject,
    unitNo: raw.unit_no,
    unitId: raw.unit_id,
    unitTitle: raw.unit_title,
    topicNo: topic.topic_no,
    topicTitle: topic.topic_title,
    orderIndex: topic.order_index,
    knowledge: mapKnowledge(topic.knowledge),
  }));
}

const UNITS = new Map<string, CurriculumTopic[]>(
  (catalog as RawCatalog).units.map((unit) => [unit.unit_id, mapUnit(unit)]),
);

export function hasGuidedCatalog(unitId?: string | null) {
  return Boolean(unitId && UNITS.has(unitId));
}

export function topicsForUnit(unitId: string): CurriculumTopic[] {
  return UNITS.get(unitId) || [];
}

export function topicById(topicId: string) {
  for (const topics of UNITS.values()) {
    const found = topics.find((topic) => topic.id === topicId);
    if (found) return found;
  }
  return null;
}

export function firstIncompleteTopic(
  unitId: string,
  completedIds: string[] = [],
) {
  const done = new Set(completedIds);
  const topics = topicsForUnit(unitId);
  return topics.find((topic) => !done.has(topic.id)) || topics[0] || null;
}

export function nextTopic(unitId: string, currentId: string) {
  const topics = topicsForUnit(unitId);
  const index = topics.findIndex((topic) => topic.id === currentId);
  if (index < 0) return topics[0] || null;
  return topics[index + 1] || null;
}

export function emptyGuidedState(
  studentId: string,
  unitId: string,
  completedIds: string[] = [],
): StudentLearningState | null {
  const topic = firstIncompleteTopic(unitId, completedIds);
  if (!topic) return null;
  return {
    studentId,
    unitId,
    currentTopicId: topic.id,
    step: "intro",
    clarificationCount: 0,
    lastInteraction: new Date().toISOString(),
    usedAnalogyIndexes: [],
    completedTopicIds: completedIds,
  };
}

export function guidedStateKey(studentId: string, unitId: string) {
  return `${studentId}::${unitId}`;
}
