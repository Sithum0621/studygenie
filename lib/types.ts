export type StudyMedium = "sinhala" | "english" | "tamil";

export type Profile = {
  id: string;
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  languageMix: "singlish" | "english";
  medium: StudyMedium;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type NoteItem = {
  id: string;
  title: string;
  body: string;
  topic: string;
  createdAt: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  subject?: string;
};

export type QuizItem = {
  id: string;
  topic: string;
  questions: QuizQuestion[];
  answers?: (number | null)[];
  score: number | null;
  createdAt: string;
  kind?: "daily" | "practice";
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  known: boolean;
};

export type FlashDeck = {
  id: string;
  topic: string;
  cards: Flashcard[];
  createdAt: string;
};

export type UploadItem = {
  id: string;
  title: string;
  fileName: string;
  size: number;
  createdAt: string;
  mime?: string;
  extract?: string;
  indexed?: boolean;
};

export type SyllabusChunk = {
  id: string;
  sourceId: string;
  title: string;
  kind: "syllabus" | "teacher-guide" | "notes";
  subject: string;
  text: string;
  createdAt: string;
};

export type ClassRoom = {
  id: string;
  name: string;
  grade: string;
  subject: string;
  createdAt: string;
};

export type ClassStudent = {
  id: string;
  classId: string;
  name: string;
  email: string;
  createdAt: string;
};

export type ClassAssignment = {
  id: string;
  classId: string;
  title: string;
  details: string;
  dueDate: string;
  done: boolean;
  createdAt: string;
};

export type ProgressState = {
  streak: number;
  lastActiveDate: string | null;
  lastQuizScore: number | null;
  lastQuizTopic: string | null;
  dailyQuizDate: string | null;
  dailyStreak: number;
};

export type YearEvent = {
  id: string;
  date: string;
  title: string;
};

export type DailyQuestion = {
  id: string;
  subject: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  createdAt: string;
};

export type DailyQuizAttempt = {
  date: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  index: number;
  revealed: boolean;
  completed: boolean;
  score: number | null;
};

export type GuideUnit = {
  id: string;
  subject: string;
  title: string;
  estimatedMinutes: number;
  doneAt: string | null;
};

export type StudyTimeState = {
  studyMinutes: number;
  wasteMinutes: number;
  bySubject: Record<string, number>;
  lastTickAt: string | null;
  lastStudySubject: string | null;
};

export type PaperKind = "past" | "model" | "own";

export type PaperItem = {
  id: string;
  kind: PaperKind;
  title: string;
  subject: string;
  year?: string;
  questions: QuizQuestion[];
  createdAt: string;
};

export type PaperAttempt = {
  id: string;
  paperId: string;
  score: number;
  timeMinutes: number;
  answers: (number | null)[];
  createdAt: string;
};

export type DailyQuizSet = {
  date: string;
  language: "singlish" | "english";
  medium?: StudyMedium;
  questions: QuizQuestion[];
  generatedAt: string;
  demo: boolean;
  styleVersion?: number;
};

export type TaskKind =
  | "daily-quiz"
  | "study"
  | "game"
  | "past-paper"
  | "model-paper";

export type StudyTask = {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  kind?: TaskKind;
  href?: string;
  why?: string;
  done: boolean;
  createdAt: string;
  source?: "ai" | "user";
};

export type DailyTaskPlan = {
  date: string;
  language: "singlish" | "english";
  tasks: StudyTask[];
  note?: string;
  generatedAt: string;
  demo: boolean;
};

export type GameSession = {
  id: string;
  score: number;
  count: number;
  createdAt: string;
};

export type StudyFocus = {
  subject: string;
  topic: string;
  level: string;
};

export type StudyPace = "slow" | "normal" | "fast";
export type StudyTechnique = "simple" | "examples" | "exam";

export type LessonPart = {
  id: string;
  title: string;
  done: boolean;
  checks: number;
  correct: number;
  completedAt: string | null;
};

export type LessonProgress = {
  unitId: string;
  subject: string;
  title: string;
  chatId: string | null;
  parts: LessonPart[];
  currentIndex: number;
  percent: number;
  pace: StudyPace;
  technique: StudyTechnique;
  avgAnswerMs: number;
  quizIds: string[];
  updatedAt: string;
};

export type StudyChat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  focus: StudyFocus | null;
  unitId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TeachingStep = "intro" | "explanation" | "checkpoint" | "completed";

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

export type McqPollQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
};

export type McqPollVote = {
  voterKey: string;
  answers: number[];
  createdAt: string;
};

export type McqPoll = {
  id: string;
  code: string;
  title: string;
  fileName: string;
  questions: McqPollQuestion[];
  votes: McqPollVote[];
  createdAt: string;
};

export type McqPollSummary = {
  id: string;
  code: string;
  title: string;
  fileName: string;
  questionCount: number;
  voteCount: number;
  createdAt: string;
};
