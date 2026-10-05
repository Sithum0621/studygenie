export type TeachingStep = "intro" | "explanation" | "checkpoint" | "completed";

export type StudentIntent =
  | "start"
  | "clarify"
  | "question"
  | "understood"
  | "check_answer";

export type TopicKnowledge = {
  cleanedContent: string;
  teacherActivities: string;
  keyTerms: string[];
  summaryPoints: string[];
  analogies: string[];
  checkpoint: string;
  checkpointOk: string[];
};

export type CurriculumTopic = {
  id: string;
  grade: number;
  subject: string;
  unitNo: number;
  unitId: string;
  unitTitle: string;
  topicNo: string;
  topicTitle: string;
  orderIndex: number;
  knowledge: TopicKnowledge;
};

export type StudentLearningState = {
  studentId: string;
  currentTopicId: string;
  step: TeachingStep;
  clarificationCount: number;
  lastInteraction: string;
  unitId: string;
  usedAnalogyIndexes: number[];
  completedTopicIds: string[];
};

export type GuidedTurnInput = {
  studentId: string;
  unitId: string;
  message: string;
  kind?: "start" | "question" | "answer";
  state?: StudentLearningState | null;
  history?: { role: string; content: string }[];
};

export type GuidedAction =
  | "teach"
  | "reexplain"
  | "answer_question"
  | "retry_check"
  | "advance"
  | "unit_done";

export type GuidedTurnResult = {
  reply: string;
  state: StudentLearningState;
  intent: StudentIntent;
  action: GuidedAction;
  advanced: boolean;
  partDone: boolean;
  correct?: boolean;
  lessonComplete: boolean;
  lockedTopicId: string;
  lockedTopicNo: string;
  analogyIndex: number;
  topic: CurriculumTopic;
  nextTopic: CurriculumTopic | null;
  focus: { subject: string; topic: string; level: string };
};
