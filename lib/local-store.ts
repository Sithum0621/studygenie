import type {
  FlashDeck,
  NoteItem,
  Profile,
  ProgressState,
  QuizItem,
  UploadItem,
  YearEvent,
  DailyQuestion,
  DailyQuizAttempt,
  DailyQuizSet,
  GuideUnit,
  PaperAttempt,
  PaperItem,
  LessonProgress,
  StudentLearningState,
  StudyChat,
  StudyTask,
  StudyTimeState,
  DailyTaskPlan,
  GameSession,
  ClassRoom,
  ClassStudent,
  ClassAssignment,
  SyllabusChunk,
  McqPollSummary,
} from "./types";
import { clearUploadBlobs } from "./upload-files";

const PREFIX = "studygenie.";

type LocalUser = Profile & { password: string };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  if (!skipCloud) cloudSaveHandler?.(key, value);
}

type CloudSaveHandler = (key: string, value: unknown) => void;

let cloudSaveHandler: CloudSaveHandler | null = null;
let skipCloud = 0;

export function setCloudSaveHandler(handler: CloudSaveHandler | null) {
  cloudSaveHandler = handler;
}

export function withLocalOnly<T>(fn: () => T): T {
  skipCloud += 1;
  try {
    return fn();
  } finally {
    skipCloud -= 1;
  }
}

const STUDENT_KEYS = [
  "notes",
  "quizzes",
  "flashcards",
  "uploads",
  "progress",
  "yearEvents",
  "dailyQuestions",
  "dailyQuizSet",
  "dailyQuizLock",
  "dailyQuizAttempt",
  "guideUnits",
  "studyTime",
  "papers",
  "paperAttempts",
  "tasks",
  "studyChats",
  "studyChatBodies",
  "lessonProgress",
  "guidedLearningState",
  "gameSessions",
  "dailyTaskPlan",
  "classRooms",
  "classStudents",
  "classAssignments",
  "classPolls",
  "syllabusChunks",
] as const;

export function clearStudentLocal() {
  withLocalOnly(() => {
    for (const key of STUDENT_KEYS) {
      localStorage.removeItem(PREFIX + key);
    }
  });
  void clearUploadBlobs();
}

export const localStore = {
  getUsers() {
    return read<LocalUser[]>("users", []);
  },
  saveUsers(users: LocalUser[]) {
    write("users", users);
  },
  getSessionId() {
    return read<string | null>("session", null);
  },
  setSessionId(id: string | null) {
    if (id) write("session", id);
    else localStorage.removeItem(PREFIX + "session");
  },
  getNotes() {
    return read<NoteItem[]>("notes", []);
  },
  saveNotes(items: NoteItem[]) {
    write("notes", items);
  },
  getQuizzes() {
    return read<QuizItem[]>("quizzes", []);
  },
  saveQuizzes(items: QuizItem[]) {
    write("quizzes", items);
  },
  getDecks() {
    return read<FlashDeck[]>("flashcards", []);
  },
  saveDecks(items: FlashDeck[]) {
    write("flashcards", items);
  },
  getUploads() {
    return read<UploadItem[]>("uploads", []);
  },
  saveUploads(items: UploadItem[]) {
    write("uploads", items);
  },
  getProgress(): ProgressState {
    return {
      streak: 0,
      lastActiveDate: null,
      lastQuizScore: null,
      lastQuizTopic: null,
      dailyQuizDate: null,
      dailyStreak: 0,
      ...read<Partial<ProgressState>>("progress", {}),
    };
  },
  saveProgress(progress: ProgressState) {
    write("progress", progress);
  },
  getYearEvents() {
    return read<YearEvent[]>("yearEvents", []);
  },
  saveYearEvents(items: YearEvent[]) {
    write("yearEvents", items);
  },
  getDailyQuestions() {
    return read<DailyQuestion[]>("dailyQuestions", []);
  },
  saveDailyQuestions(items: DailyQuestion[]) {
    write("dailyQuestions", items);
  },
  getDailyQuizSet() {
    return read<DailyQuizSet | null>("dailyQuizSet", null);
  },
  saveDailyQuizSet(set: DailyQuizSet | null) {
    if (set) write("dailyQuizSet", set);
    else {
      localStorage.removeItem(PREFIX + "dailyQuizSet");
      if (!skipCloud) cloudSaveHandler?.("dailyQuizSet", null);
    }
  },
  getDailyQuizLock() {
    return read<{ date: string; startedAt: string } | null>(
      "dailyQuizLock",
      null,
    );
  },
  saveDailyQuizLock(lock: { date: string; startedAt: string } | null) {
    if (lock) write("dailyQuizLock", lock);
    else localStorage.removeItem(PREFIX + "dailyQuizLock");
  },
  getDailyQuizAttempt() {
    return read<DailyQuizAttempt | null>("dailyQuizAttempt", null);
  },
  saveDailyQuizAttempt(attempt: DailyQuizAttempt | null) {
    if (attempt) write("dailyQuizAttempt", attempt);
    else localStorage.removeItem(PREFIX + "dailyQuizAttempt");
  },
  getGuideUnits() {
    return read<GuideUnit[]>("guideUnits", []);
  },
  saveGuideUnits(items: GuideUnit[]) {
    write("guideUnits", items);
  },
  getStudyTime(): StudyTimeState {
    return {
      studyMinutes: 0,
      wasteMinutes: 0,
      bySubject: {},
      lastTickAt: null,
      lastStudySubject: null,
      ...read<Partial<StudyTimeState>>("studyTime", {}),
    };
  },
  saveStudyTime(state: StudyTimeState) {
    write("studyTime", state);
  },
  getPapers() {
    return read<PaperItem[]>("papers", []);
  },
  savePapers(items: PaperItem[]) {
    write("papers", items);
  },
  getPaperAttempts() {
    return read<PaperAttempt[]>("paperAttempts", []);
  },
  savePaperAttempts(items: PaperAttempt[]) {
    write("paperAttempts", items);
  },
  getTasks() {
    return read<StudyTask[]>("tasks", []);
  },
  saveTasks(items: StudyTask[]) {
    write("tasks", items);
  },
  getStudyChats() {
    const stored = read<StudyChat[]>("studyChats", []);
    const bodies = read<Record<string, StudyChat["messages"]>>(
      "studyChatBodies",
      {},
    );
    return stored.map((chat) => ({
      ...chat,
      messages: chat.messages?.length
        ? chat.messages
        : bodies[chat.id] || [],
    }));
  },
  saveStudyChats(items: StudyChat[]) {
    const bodies: Record<string, StudyChat["messages"]> = {};
    const metas = items.map((chat) => {
      bodies[chat.id] = chat.messages || [];
      return { ...chat, messages: [] as StudyChat["messages"] };
    });
    write("studyChatBodies", bodies);
    write("studyChats", metas);
  },
  getLessonProgress() {
    return read<LessonProgress[]>("lessonProgress", []);
  },
  saveLessonProgress(items: LessonProgress[]) {
    write("lessonProgress", items);
  },
  getGuidedLearningState() {
    return read<StudentLearningState[]>("guidedLearningState", []);
  },
  saveGuidedLearningState(items: StudentLearningState[]) {
    write("guidedLearningState", items);
  },
  getProfileExtras() {
    return read<Record<string, { medium?: Profile["medium"] }>>(
      "profileExtras",
      {},
    );
  },
  saveProfileExtra(id: string, patch: { medium?: Profile["medium"] }) {
    const all = this.getProfileExtras();
    write("profileExtras", {
      ...all,
      [id]: { ...all[id], ...patch },
    });
  },
  getGameSessions() {
    return read<GameSession[]>("gameSessions", []);
  },
  saveGameSessions(items: GameSession[]) {
    write("gameSessions", items);
  },
  getClasses() {
    return read<ClassRoom[]>("classRooms", []);
  },
  saveClasses(items: ClassRoom[]) {
    write("classRooms", items);
  },
  getClassStudents() {
    return read<ClassStudent[]>("classStudents", []);
  },
  saveClassStudents(items: ClassStudent[]) {
    write("classStudents", items);
  },
  getClassAssignments() {
    return read<ClassAssignment[]>("classAssignments", []);
  },
  saveClassAssignments(items: ClassAssignment[]) {
    write("classAssignments", items);
  },
  getMcqPolls() {
    return read<McqPollSummary[]>("classPolls", []);
  },
  saveMcqPolls(items: McqPollSummary[]) {
    write("classPolls", items);
  },
  getSyllabusChunks() {
    return read<SyllabusChunk[]>("syllabusChunks", []);
  },
  saveSyllabusChunks(items: SyllabusChunk[]) {
    write("syllabusChunks", items);
  },
  getDailyTaskPlan() {
    return read<DailyTaskPlan | null>("dailyTaskPlan", null);
  },
  saveDailyTaskPlan(plan: DailyTaskPlan | null) {
    if (plan) write("dailyTaskPlan", plan);
    else {
      localStorage.removeItem(PREFIX + "dailyTaskPlan");
      if (!skipCloud) cloudSaveHandler?.("dailyTaskPlan", null);
    }
  },
  touchStreak() {
    const progress = this.getProgress();
    const today = new Date().toISOString().slice(0, 10);
    if (progress.lastActiveDate === today) return progress;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = yesterday.toISOString().slice(0, 10);
    const next: ProgressState = {
      ...progress,
      lastActiveDate: today,
      streak:
        progress.lastActiveDate === ymd ? progress.streak + 1 : 1,
    };
    this.saveProgress(next);
    return next;
  },
};
