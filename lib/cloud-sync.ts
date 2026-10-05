"use client";

import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { localStore, setCloudSaveHandler, withLocalOnly } from "./local-store";
import type {
  DailyQuizAttempt,
  DailyQuizSet,
  DailyTaskPlan,
  FlashDeck,
  GameSession,
  GuideUnit,
  NoteItem,
  PaperAttempt,
  PaperItem,
  ProgressState,
  QuizItem,
  QuizQuestion,
  StudyChat,
  StudyTimeState,
  UploadItem,
  YearEvent,
  ClassRoom,
  ClassStudent,
  ClassAssignment,
  SyllabusChunk,
  StudentLearningState,
} from "./types";

const timers = new Map<string, number>();

function client() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

function schedule(key: string, run: () => Promise<void>) {
  const prev = timers.get(key);
  if (prev) window.clearTimeout(prev);
  timers.set(
    key,
    window.setTimeout(() => {
      timers.delete(key);
      void run().catch(() => undefined);
    }, 450),
  );
}

async function uid() {
  const supabase = client();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function questionRows(
  parentId: string,
  userId: string,
  parentKey: "quiz_id" | "set_id" | "paper_id",
  questions: QuizQuestion[],
  extra: Record<string, unknown> = {},
) {
  return questions.map((question, index) => ({
    id: question.id || `${parentId}_${index}`,
    [parentKey]: parentId,
    user_id: userId,
    prompt: question.prompt,
    options: question.options,
    answer_index: question.answerIndex,
    explanation: question.explanation || "",
    subject: question.subject || null,
    sort_order: index,
    ...extra,
  }));
}

function fromQuestion(row: {
  id: string;
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string | null;
  subject: string | null;
}): QuizQuestion {
  return {
    id: row.id,
    prompt: row.prompt,
    options: row.options || [],
    answerIndex: row.answer_index,
    explanation: row.explanation || "",
    subject: row.subject || undefined,
  };
}

async function replaceOwned(
  table: string,
  userId: string,
  keepIds: string[],
) {
  const supabase = client();
  if (!supabase) return;
  const { data } = await supabase.from(table).select("id").eq("user_id", userId);
  const extra = (data || [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.includes(id));
  if (extra.length) await supabase.from(table).delete().in("id", extra);
}

async function pushNotes(userId: string, items: NoteItem[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("study_notes", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("study_notes").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      title: item.title,
      body: item.body,
      topic: item.topic,
      created_at: item.createdAt,
    })),
  );
}

async function pushQuizzes(userId: string, items: QuizItem[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("study_quizzes", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("study_quizzes").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      topic: item.topic,
      kind: item.kind || "practice",
      score: item.score,
      answers: item.answers ?? null,
      created_at: item.createdAt,
    })),
  );
  const quizIds = items.map((item) => item.id);
  await supabase.from("study_quiz_questions").delete().in("quiz_id", quizIds);
  const rows = items.flatMap((item) =>
    questionRows(item.id, userId, "quiz_id", item.questions),
  );
  if (rows.length) await supabase.from("study_quiz_questions").insert(rows);
}

async function pushDecks(userId: string, items: FlashDeck[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("study_flashcard_decks", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("study_flashcard_decks").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      topic: item.topic,
      created_at: item.createdAt,
    })),
  );
  const deckIds = items.map((item) => item.id);
  await supabase.from("study_flashcards").delete().in("deck_id", deckIds);
  const cards = items.flatMap((deck) =>
    deck.cards.map((card, index) => ({
      id: card.id,
      deck_id: deck.id,
      user_id: userId,
      front: card.front,
      back: card.back,
      known: card.known,
      sort_order: index,
    })),
  );
  if (cards.length) await supabase.from("study_flashcards").insert(cards);
}

async function pushUploads(userId: string, items: UploadItem[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("study_documents", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("study_documents").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      title: item.title,
      file_name: item.fileName,
      size_bytes: item.size,
      created_at: item.createdAt,
    })),
  );
}

async function pushProgress(userId: string, progress: ProgressState) {
  const supabase = client();
  if (!supabase) return;
  await supabase.from("user_progress").upsert({
    user_id: userId,
    streak: progress.streak,
    last_active_date: progress.lastActiveDate,
    last_quiz_score: progress.lastQuizScore,
    last_quiz_topic: progress.lastQuizTopic,
    daily_quiz_date: progress.dailyQuizDate,
    daily_streak: progress.dailyStreak || 0,
    updated_at: new Date().toISOString(),
  });
}

async function pushYearEvents(userId: string, items: YearEvent[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("year_events", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("year_events").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      event_date: item.date,
      title: item.title,
    })),
  );
}

async function pushDailyQuizSet(userId: string, set: DailyQuizSet | null) {
  const supabase = client();
  if (!supabase) return;
  if (!set) return;
  const id = `${userId}:${set.date}`;
  await supabase.from("daily_quiz_sets").upsert({
    id,
    user_id: userId,
    quiz_date: set.date,
    language: set.language,
    medium: set.medium || null,
    generated_at: set.generatedAt,
    demo: set.demo,
    style_version: set.styleVersion || 0,
  });
  await supabase.from("daily_quiz_set_questions").delete().eq("set_id", id);
  const rows = questionRows(id, userId, "set_id", set.questions);
  if (rows.length) await supabase.from("daily_quiz_set_questions").insert(rows);
}

async function pushDailyQuizAttempt(userId: string, attempt: DailyQuizAttempt | null) {
  const supabase = client();
  if (!supabase || !attempt) return;
  await supabase.from("daily_quiz_attempts").upsert({
    user_id: userId,
    quiz_date: attempt.date,
    set_id: `${userId}:${attempt.date}`,
    answers: attempt.answers,
    question_index: attempt.index,
    revealed: attempt.revealed,
    completed: attempt.completed,
    score: attempt.score,
  });
}

async function pushGuidedState(userId: string, items: StudentLearningState[]) {
  const supabase = client();
  if (!supabase) return;
  const rows = items.filter((item) => item.unitId);
  if (!rows.length) return;
  await supabase.from("student_learning_state").upsert(
    rows.map((item) => ({
      student_id: userId,
      unit_id: item.unitId,
      current_topic_id: item.currentTopicId,
      step: item.step,
      clarification_count: item.clarificationCount,
      last_interaction: item.lastInteraction,
      used_analogy_indexes: item.usedAnalogyIndexes,
      completed_topic_ids: item.completedTopicIds,
    })),
  );
}

async function pullGuidedState(userId: string): Promise<StudentLearningState[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("student_learning_state")
    .select(
      "student_id, unit_id, current_topic_id, step, clarification_count, last_interaction, used_analogy_indexes, completed_topic_ids",
    )
    .eq("student_id", userId);
  if (error || !data) return [];
  return data
    .filter((row) => row.unit_id && row.current_topic_id)
    .map((row) => ({
      studentId: row.student_id,
      unitId: row.unit_id,
      currentTopicId: row.current_topic_id,
      step: (row.step || "intro") as StudentLearningState["step"],
      clarificationCount: row.clarification_count || 0,
      lastInteraction: row.last_interaction,
      usedAnalogyIndexes: row.used_analogy_indexes || [],
      completedTopicIds: row.completed_topic_ids || [],
    }));
}

async function pushGuide(userId: string, items: GuideUnit[]) {
  const supabase = client();
  if (!supabase) return;
  if (!items.length) return;
  await supabase.from("guide_progress").upsert(
    items.map((item) => ({
      user_id: userId,
      unit_id: item.id,
      subject: item.subject,
      title: item.title,
      estimated_minutes: item.estimatedMinutes,
      done_at: item.doneAt,
    })),
  );
}

async function pushStudyTime(userId: string, state: StudyTimeState) {
  const supabase = client();
  if (!supabase) return;
  await supabase.from("study_time").upsert({
    user_id: userId,
    study_minutes: state.studyMinutes,
    waste_minutes: state.wasteMinutes,
    last_tick_at: state.lastTickAt,
    last_study_subject: state.lastStudySubject,
  });
  const subjects = Object.entries(state.bySubject || {});
  if (!subjects.length) return;
  await supabase.from("study_time_subjects").upsert(
    subjects.map(([subject, minutes]) => ({
      user_id: userId,
      subject,
      minutes,
    })),
  );
}

async function pushPapers(userId: string, items: PaperItem[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("study_papers", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("study_papers").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      kind: item.kind,
      title: item.title,
      subject: item.subject,
      year: item.year || null,
      created_at: item.createdAt,
    })),
  );
  const ids = items.map((item) => item.id);
  await supabase.from("study_paper_questions").delete().in("paper_id", ids);
  const rows = items.flatMap((item) =>
    questionRows(item.id, userId, "paper_id", item.questions),
  );
  if (rows.length) await supabase.from("study_paper_questions").insert(rows);
}

async function pushPaperAttempts(userId: string, items: PaperAttempt[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("study_paper_attempts", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("study_paper_attempts").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      paper_id: item.paperId,
      score: item.score,
      time_minutes: item.timeMinutes,
      answers: item.answers,
      created_at: item.createdAt,
    })),
  );
}

async function pushChats(userId: string, items: StudyChat[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("study_chats", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("study_chats").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      kind: "study",
      title: item.title,
      focus_subject: item.focus?.subject || null,
      focus_topic: item.focus?.topic || null,
      focus_level: item.focus?.level || null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    })),
  );
  const ids = items.map((item) => item.id);
  await supabase.from("study_messages").delete().in("chat_id", ids);
  const messages = items.flatMap((chat) =>
    chat.messages.map((message, index) => ({
      id: message.id,
      chat_id: chat.id,
      user_id: userId,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
      sort_order: index,
    })),
  );
  if (messages.length) await supabase.from("study_messages").insert(messages);
}

async function pushTaskPlan(userId: string, plan: DailyTaskPlan | null) {
  const supabase = client();
  if (!supabase || !plan) return;
  await supabase.from("daily_task_plans").upsert({
    user_id: userId,
    plan_date: plan.date,
    language: plan.language,
    note: plan.note || null,
    generated_at: plan.generatedAt,
    demo: plan.demo,
  });
  await supabase
    .from("study_tasks")
    .delete()
    .eq("user_id", userId)
    .eq("plan_date", plan.date);
  if (!plan.tasks.length) return;
  await supabase.from("study_tasks").insert(
    plan.tasks.map((task, index) => ({
      id: task.id,
      user_id: userId,
      plan_date: plan.date,
      title: task.title,
      subject: task.subject,
      topic: task.topic || null,
      kind: task.kind || null,
      href: task.href || null,
      why: task.why || null,
      done: task.done,
      source: task.source || null,
      sort_order: index,
      created_at: task.createdAt,
    })),
  );
}

async function pushClasses(userId: string, items: ClassRoom[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("class_rooms", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("class_rooms").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      grade: item.grade,
      subject: item.subject,
      created_at: item.createdAt,
    })),
  );
}

async function pushClassStudents(userId: string, items: ClassStudent[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("class_students", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("class_students").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      class_id: item.classId,
      name: item.name,
      email: item.email,
      created_at: item.createdAt,
    })),
  );
}

async function pushSyllabusChunks(userId: string, items: SyllabusChunk[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("syllabus_chunks", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("syllabus_chunks").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      source_id: item.sourceId,
      title: item.title,
      kind: item.kind,
      subject: item.subject,
      body: item.text,
      created_at: item.createdAt,
    })),
  );
}

async function pushClassAssignments(userId: string, items: ClassAssignment[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("class_assignments", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("class_assignments").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      class_id: item.classId,
      title: item.title,
      details: item.details,
      due_date: item.dueDate || null,
      done: item.done,
      created_at: item.createdAt,
    })),
  );
}

async function pushGames(userId: string, items: GameSession[]) {
  const supabase = client();
  if (!supabase) return;
  await replaceOwned("game_sessions", userId, items.map((item) => item.id));
  if (!items.length) return;
  await supabase.from("game_sessions").upsert(
    items.map((item) => ({
      id: item.id,
      user_id: userId,
      score: item.score,
      question_count: item.count,
      created_at: item.createdAt,
    })),
  );
}

function onLocalSave(key: string, value: unknown) {
  const skip = new Set(["users", "session", "dailyQuizLock", "profileExtras"]);
  if (skip.has(key)) return;
  schedule(key, async () => {
    const userId = await uid();
    if (!userId) return;
    if (key === "notes") await pushNotes(userId, value as NoteItem[]);
    else if (key === "quizzes") await pushQuizzes(userId, value as QuizItem[]);
    else if (key === "flashcards") await pushDecks(userId, value as FlashDeck[]);
    else if (key === "uploads") await pushUploads(userId, value as UploadItem[]);
    else if (key === "progress") await pushProgress(userId, value as ProgressState);
    else if (key === "yearEvents") await pushYearEvents(userId, value as YearEvent[]);
    else if (key === "dailyQuizSet") {
      await pushDailyQuizSet(userId, value as DailyQuizSet | null);
    } else if (key === "dailyQuizAttempt") {
      await pushDailyQuizAttempt(userId, value as DailyQuizAttempt | null);
    } else if (key === "guideUnits") await pushGuide(userId, value as GuideUnit[]);
    else if (key === "studyTime") await pushStudyTime(userId, value as StudyTimeState);
    else if (key === "papers") await pushPapers(userId, value as PaperItem[]);
    else if (key === "paperAttempts") {
      await pushPaperAttempts(userId, value as PaperAttempt[]);
    } else if (key === "studyChats" || key === "studyChatBodies") {
      await pushChats(userId, localStore.getStudyChats());
    } else if (key === "lessonProgress") {
      return;
    } else if (key === "guidedLearningState") {
      await pushGuidedState(userId, value as StudentLearningState[]);
    }
    else if (key === "dailyTaskPlan") {
      await pushTaskPlan(userId, value as DailyTaskPlan | null);
    } else if (key === "tasks") {
      const plan = localStore.getDailyTaskPlan();
      if (plan) await pushTaskPlan(userId, { ...plan, tasks: value as DailyTaskPlan["tasks"] });
    }     else if (key === "gameSessions") await pushGames(userId, value as GameSession[]);
    else if (key === "classRooms") await pushClasses(userId, value as ClassRoom[]);
    else if (key === "classStudents") {
      await pushClassStudents(userId, value as ClassStudent[]);
    } else if (key === "classAssignments") {
      await pushClassAssignments(userId, value as ClassAssignment[]);
    } else if (key === "syllabusChunks") {
      await pushSyllabusChunks(userId, value as SyllabusChunk[]);
    }
  });
}

async function pullNotes(userId: string) {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("study_notes")
    .select("id, title, body, topic, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    topic: row.topic,
    createdAt: row.created_at,
  })) as NoteItem[];
}

async function pullQuizzes(userId: string) {
  const supabase = client();
  if (!supabase) return [];
  const { data: quizzes, error } = await supabase
    .from("study_quizzes")
    .select("id, topic, kind, score, answers, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !quizzes?.length) return [];
  const { data: questions } = await supabase
    .from("study_quiz_questions")
    .select("id, quiz_id, prompt, options, answer_index, explanation, subject, sort_order")
    .eq("user_id", userId)
    .order("sort_order");
  const byQuiz = new Map<string, QuizQuestion[]>();
  for (const row of questions || []) {
    const list = byQuiz.get(row.quiz_id) || [];
    list.push(fromQuestion(row));
    byQuiz.set(row.quiz_id, list);
  }
  return quizzes.map((row) => ({
    id: row.id,
    topic: row.topic,
    kind: row.kind === "daily" ? "daily" : "practice",
    score: row.score,
    answers: row.answers as QuizItem["answers"],
    createdAt: row.created_at,
    questions: byQuiz.get(row.id) || [],
  })) as QuizItem[];
}

async function pullDecks(userId: string) {
  const supabase = client();
  if (!supabase) return [];
  const { data: decks, error } = await supabase
    .from("study_flashcard_decks")
    .select("id, topic, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !decks?.length) return [];
  const { data: cards } = await supabase
    .from("study_flashcards")
    .select("id, deck_id, front, back, known, sort_order")
    .eq("user_id", userId)
    .order("sort_order");
  const byDeck = new Map<string, FlashDeck["cards"]>();
  for (const row of cards || []) {
    const list = byDeck.get(row.deck_id) || [];
    list.push({
      id: row.id,
      front: row.front,
      back: row.back,
      known: row.known,
    });
    byDeck.set(row.deck_id, list);
  }
  return decks.map((row) => ({
    id: row.id,
    topic: row.topic,
    createdAt: row.created_at,
    cards: byDeck.get(row.id) || [],
  })) as FlashDeck[];
}

export async function hydrateFromCloud(options?: { pushIfEmpty?: boolean }) {
  try {
    const userId = await uid();
    if (!userId) return;

  const [
    notes,
    quizzes,
    decks,
    uploads,
    progress,
    events,
    sets,
    attempt,
    guide,
    time,
    timeSubjects,
    papers,
    paperAttempts,
    chats,
    messages,
    plan,
    tasks,
    games,
    classRooms,
    classStudents,
    classAssignments,
    syllabusChunks,
  ] = await Promise.all([
    pullNotes(userId),
    pullQuizzes(userId),
    pullDecks(userId),
    client()
      ?.from("study_documents")
      .select("id, title, file_name, size_bytes, created_at")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then((res) => res.data),
    client()
      ?.from("year_events")
      .select("id, event_date, title")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("daily_quiz_sets")
      .select("*")
      .eq("user_id", userId)
      .order("quiz_date", { ascending: false })
      .limit(1)
      .then((res) => res.data?.[0] || null),
    client()
      ?.from("daily_quiz_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("quiz_date", { ascending: false })
      .limit(1)
      .then((res) => res.data?.[0] || null),
    client()
      ?.from("guide_progress")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("study_time")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then((res) => res.data),
    client()
      ?.from("study_time_subjects")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("study_papers")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("study_paper_attempts")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("study_chats")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .then((res) => res.data || []),
    client()
      ?.from("study_messages")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order")
      .then((res) => res.data || []),
    client()
      ?.from("daily_task_plans")
      .select("*")
      .eq("user_id", userId)
      .order("plan_date", { ascending: false })
      .limit(1)
      .then((res) => res.data?.[0] || null),
    client()
      ?.from("study_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order")
      .then((res) => res.data || []),
    client()
      ?.from("game_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then((res) => res.data || []),
    client()
      ?.from("class_rooms")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("class_students")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("class_assignments")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
    client()
      ?.from("syllabus_chunks")
      .select("*")
      .eq("user_id", userId)
      .then((res) => res.data || []),
  ]);

  const cloudHasAnything = Boolean(
    notes.length ||
      quizzes.length ||
      decks.length ||
      progress ||
      (uploads && uploads.length) ||
      (chats && chats.length) ||
      (classRooms && classRooms.length),
  );

  if (!cloudHasAnything) {
    if (options?.pushIfEmpty !== false) await pushAllLocal(userId);
    return;
  }

  const setQuestions = sets
    ? (
        await client()
          ?.from("daily_quiz_set_questions")
          .select("*")
          .eq("set_id", sets.id)
          .order("sort_order")
      )?.data || []
    : [];

  const paperQuestions =
    (
      await client()
        ?.from("study_paper_questions")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order")
    )?.data || [];

  const guidedRows = await pullGuidedState(userId);

  withLocalOnly(() => {
    if (notes.length) localStore.saveNotes(notes);
    if (quizzes.length) localStore.saveQuizzes(quizzes);
    if (decks.length) localStore.saveDecks(decks);
    if (uploads?.length) {
      const previous = new Map(
        localStore.getUploads().map((item) => [item.id, item]),
      );
      localStore.saveUploads(
        uploads.map((row) => ({
          id: row.id,
          title: row.title,
          fileName: row.file_name,
          size: row.size_bytes,
          createdAt: row.created_at,
          mime: previous.get(row.id)?.mime,
          extract: previous.get(row.id)?.extract,
          indexed: previous.get(row.id)?.indexed,
        })),
      );
    }
    if (progress) {
      localStore.saveProgress({
        streak: progress.streak,
        lastActiveDate: progress.last_active_date,
        lastQuizScore: progress.last_quiz_score,
        lastQuizTopic: progress.last_quiz_topic,
        dailyQuizDate: progress.daily_quiz_date,
        dailyStreak: progress.daily_streak,
      });
    }
    if (events?.length) {
      localStore.saveYearEvents(
        events.map((row) => ({
          id: row.id,
          date: row.event_date,
          title: row.title,
        })),
      );
    }
    if (sets) {
      localStore.saveDailyQuizSet({
        date: sets.quiz_date,
        language: sets.language === "english" ? "english" : "singlish",
        medium: sets.medium || undefined,
        questions: setQuestions.map(fromQuestion),
        generatedAt: sets.generated_at,
        demo: sets.demo,
        styleVersion: sets.style_version,
      });
    }
    if (attempt) {
      localStore.saveDailyQuizAttempt({
        date: attempt.quiz_date,
        questions: setQuestions.map(fromQuestion),
        answers: attempt.answers || [],
        index: attempt.question_index,
        revealed: attempt.revealed,
        completed: attempt.completed,
        score: attempt.score,
      });
    }
    if (guide?.length) {
      localStore.saveGuideUnits(
        guide.map((row) => ({
          id: row.unit_id,
          subject: row.subject,
          title: row.title,
          estimatedMinutes: row.estimated_minutes,
          doneAt: row.done_at,
        })),
      );
    }
    if (time) {
      const bySubject: Record<string, number> = {};
      for (const row of timeSubjects || []) bySubject[row.subject] = row.minutes;
      localStore.saveStudyTime({
        studyMinutes: time.study_minutes,
        wasteMinutes: time.waste_minutes,
        bySubject,
        lastTickAt: time.last_tick_at,
        lastStudySubject: time.last_study_subject,
      });
    }
    if (papers?.length) {
      const byPaper = new Map<string, QuizQuestion[]>();
      for (const row of paperQuestions) {
        const list = byPaper.get(row.paper_id) || [];
        list.push(fromQuestion(row));
        byPaper.set(row.paper_id, list);
      }
      localStore.savePapers(
        papers.map((row) => ({
          id: row.id,
          kind: row.kind,
          title: row.title,
          subject: row.subject,
          year: row.year || undefined,
          createdAt: row.created_at,
          questions: byPaper.get(row.id) || [],
        })),
      );
    }
    if (paperAttempts?.length) {
      localStore.savePaperAttempts(
        paperAttempts.map((row) => ({
          id: row.id,
          paperId: row.paper_id,
          score: row.score,
          timeMinutes: row.time_minutes,
          answers: row.answers || [],
          createdAt: row.created_at,
        })),
      );
    }
    if (chats?.length) {
      const byChat = new Map<string, StudyChat["messages"]>();
      for (const row of messages || []) {
        const list = byChat.get(row.chat_id) || [];
        list.push({
          id: row.id,
          role: row.role,
          content: row.content,
          createdAt: row.created_at,
        });
        byChat.set(row.chat_id, list);
      }
      localStore.saveStudyChats(
        chats.map((row) => ({
          id: row.id,
          title: row.title,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          focus:
            row.focus_subject && row.focus_topic
              ? {
                  subject: row.focus_subject,
                  topic: row.focus_topic,
                  level: row.focus_level || "starting",
                }
              : null,
          messages: byChat.get(row.id) || [],
        })),
      );
    }
    if (plan) {
      const planTasks = (tasks || []).filter((row) => row.plan_date === plan.plan_date);
      localStore.saveDailyTaskPlan({
        date: plan.plan_date,
        language: plan.language === "english" ? "english" : "singlish",
        note: plan.note || "",
        generatedAt: plan.generated_at,
        demo: plan.demo,
        tasks: planTasks.map((row) => ({
          id: row.id,
          title: row.title,
          subject: row.subject,
          topic: row.topic || undefined,
          kind: row.kind || undefined,
          href: row.href || undefined,
          why: row.why || "",
          done: row.done,
          createdAt: row.created_at,
          source: row.source || undefined,
        })),
      });
    }
    if (games?.length) {
      localStore.saveGameSessions(
        games.map((row) => ({
          id: row.id,
          score: row.score,
          count: row.question_count,
          createdAt: row.created_at,
        })),
      );
    }
    if (classRooms?.length) {
      localStore.saveClasses(
        classRooms.map((row) => ({
          id: row.id,
          name: row.name,
          grade: row.grade || "",
          subject: row.subject || "",
          createdAt: row.created_at,
        })),
      );
    }
    if (classStudents?.length) {
      localStore.saveClassStudents(
        classStudents.map((row) => ({
          id: row.id,
          classId: row.class_id,
          name: row.name,
          email: row.email || "",
          createdAt: row.created_at,
        })),
      );
    }
    if (classAssignments?.length) {
      localStore.saveClassAssignments(
        classAssignments.map((row) => ({
          id: row.id,
          classId: row.class_id,
          title: row.title,
          details: row.details || "",
          dueDate: row.due_date || "",
          done: Boolean(row.done),
          createdAt: row.created_at,
        })),
      );
    }
    if (guidedRows.length) {
      localStore.saveGuidedLearningState(guidedRows);
    }
    if (syllabusChunks?.length) {
      localStore.saveSyllabusChunks(
        syllabusChunks.map((row) => ({
          id: row.id,
          sourceId: row.source_id,
          title: row.title,
          kind:
            row.kind === "teacher-guide" || row.kind === "syllabus"
              ? row.kind
              : "notes",
          subject: row.subject || "",
          text: row.body,
          createdAt: row.created_at,
        })),
      );
    }
  });
  } catch {
    return;
  }
}

async function pushAllLocal(userId: string) {
  await pushNotes(userId, localStore.getNotes());
  await pushQuizzes(userId, localStore.getQuizzes());
  await pushDecks(userId, localStore.getDecks());
  await pushUploads(userId, localStore.getUploads());
  await pushProgress(userId, localStore.getProgress());
  await pushYearEvents(userId, localStore.getYearEvents());
  await pushDailyQuizSet(userId, localStore.getDailyQuizSet());
  await pushDailyQuizAttempt(userId, localStore.getDailyQuizAttempt());
  await pushGuide(userId, localStore.getGuideUnits());
  await pushStudyTime(userId, localStore.getStudyTime());
  await pushPapers(userId, localStore.getPapers());
  await pushPaperAttempts(userId, localStore.getPaperAttempts());
  await pushChats(userId, localStore.getStudyChats());
  await pushTaskPlan(userId, localStore.getDailyTaskPlan());
  await pushGames(userId, localStore.getGameSessions());
  await pushClasses(userId, localStore.getClasses());
  await pushClassStudents(userId, localStore.getClassStudents());
  await pushClassAssignments(userId, localStore.getClassAssignments());
  await pushSyllabusChunks(userId, localStore.getSyllabusChunks());
  await pushGuidedState(userId, localStore.getGuidedLearningState());
}

export function startCloudSync() {
  setCloudSaveHandler(onLocalSave);
}

export function stopCloudSync() {
  setCloudSaveHandler(null);
  timers.forEach((id) => window.clearTimeout(id));
  timers.clear();
}
