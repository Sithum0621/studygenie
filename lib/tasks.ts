import type { AppLanguage } from "./copy";
import { localStore } from "./local-store";
import type { StudentSnapshot } from "./student-context";
import { collectStudentActivity } from "./student-activity";
import { collectStudyFocuses } from "./study-chats";
import { toYmd } from "./year";
import type { DailyTaskPlan, StudyTask, TaskKind } from "./types";

const u = (...codes: number[]) => String.fromCharCode(...codes);
const mx = {
  eka: u(0x0d91, 0x0d9a),
  eke: u(0x0d91, 0x0d9a, 0x0dda),
  eken: u(0x0d91, 0x0d9a, 0x0dd9, 0x0db1, 0x0dca),
  ekak: u(0x0d91, 0x0d9a, 0x0d9a, 0x0dca),
  karanna: u(0x0d9a, 0x0dbb, 0x0db1, 0x0dca, 0x0db1),
  hema: u(0x0dc4, 0x0dd0, 0x0db8),
  dawasama: u(0x0daf, 0x0dc0, 0x0dc3, 0x0db8),
  thiyenna: u(0x0dad, 0x0dd2, 0x0dba, 0x0dd9, 0x0db1, 0x0dca, 0x0db1),
  ona: u(0x0d95, 0x0db1),
  kotasa: u(0x0d9a, 0x0ddc, 0x0da7, 0x0dc3),
  iganaganna: u(
    0x0d89,
    0x0d9c,
    0x0dd9,
    0x0db1,
    0x0d9c,
    0x0db1,
    0x0dca,
    0x0db1,
  ),
  una: u(0x0d8b, 0x0db1, 0x0dcf),
  witharayi: u(
    0x0dc0,
    0x0dd2,
    0x0dad,
    0x0dbb,
    0x0dba,
    0x0dd2,
  ),
  balala: u(0x0db6, 0x0dbd, 0x0dbd, 0x0dcf),
  thawa: u(0x0dad, 0x0dc0),
  startWela: u(0x0dc0, 0x0dd9, 0x0dbd, 0x0dcf),
  nehae: u(0x0db1, 0x0dd0, 0x0dc4, 0x0dd0),
  gihin: u(0x0d9c, 0x0dd2, 0x0dc4, 0x0dd2, 0x0db1),
  nam: u(0x0db1, 0x0db8, 0x0dca),
};

export const TASK_HREF: Record<TaskKind, string> = {
  "daily-quiz": "/daily-questions",
  study: "/study",
  game: "/game",
  "past-paper": "/papers?tab=past",
  "model-paper": "/papers?tab=model",
};

const KINDS = new Set<TaskKind>(Object.keys(TASK_HREF) as TaskKind[]);

function parseKind(value: unknown, title: string): TaskKind | null {
  const raw = String(value || "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  if (KINDS.has(raw as TaskKind)) return raw as TaskKind;
  const blob = `${raw} ${title}`.toLowerCase();
  if (blob.includes("daily") && blob.includes("quiz")) return "daily-quiz";
  if (blob.includes("past")) return "past-paper";
  if (blob.includes("model")) return "model-paper";
  if (blob.includes("game")) return "game";
  if (blob.includes("study") || blob.includes("learn")) return "study";
  return null;
}

export function hrefForKind(kind: TaskKind) {
  return TASK_HREF[kind];
}

export function loadTaskPlan() {
  return localStore.getDailyTaskPlan();
}

export function saveTaskPlan(plan: DailyTaskPlan) {
  localStore.saveDailyTaskPlan(plan);
  localStore.saveTasks(plan.tasks);
  return plan;
}

function makeTask(
  kind: TaskKind,
  title: string,
  subject: string,
  extra?: Partial<StudyTask>,
): StudyTask {
  return {
    id: extra?.id || crypto.randomUUID(),
    title,
    subject,
    kind,
    href: hrefForKind(kind),
    why: extra?.why || "",
    topic: extra?.topic,
    done: Boolean(extra?.done),
    createdAt: extra?.createdAt || new Date().toISOString(),
    source: extra?.source || "ai",
  };
}

export function mockDailyTasks(
  language: AppLanguage,
  date = toYmd(new Date()),
  note = "",
  snapshot?: StudentSnapshot,
): StudyTask[] {
  const activity = snapshot?.activity ?? collectStudentActivity(date);
  const focus = snapshot?.studyFocus[0] || collectStudyFocuses(1)[0];
  const subject = focus?.subject || snapshot?.subjects[0] || "Science";
  const topic = focus?.topic || "foundation";
  const singlish = language !== "english";
  const quizDone = activity.dailyQuizDoneToday;
  const tasks: StudyTask[] = [
    makeTask(
      "daily-quiz",
      singlish
        ? `Ada Daily Quiz ${mx.eka} ${mx.karanna}`
        : "Do today's Daily Quiz",
      "Mix",
      {
        why: singlish
          ? `${mx.hema} ${mx.dawasama} quiz ${mx.eka} ${mx.thiyenna} ${mx.ona}.`
          : "Daily Quiz is required every day.",
        done: quizDone,
      },
    ),
    makeTask(
      "study",
      singlish
        ? `${subject} ${mx.eke} "${topic}" ${mx.kotasa} ${mx.iganaganna}`
        : `Learn ${subject}: ${topic}`,
      subject,
      {
        topic,
        why: singlish
          ? `Study chat / weak area ${mx.eken} me ${mx.kotasa} pick ${mx.una}.`
          : "Picked from study chat or a weak area.",
      },
    ),
  ];

  if (activity.gameSessions7d < 2) {
    const rounds = activity.gameSessions7d === 0 ? 1 : 1;
    tasks.push(
      makeTask(
        "game",
        singlish
          ? `Game ${mx.eken} round ${rounds}k (questions 8k) try ${mx.karanna}`
          : `Play ${rounds} game round (8 questions)`,
        "Mix",
        {
          why: singlish
            ? `Me week games ${activity.gameSessions7d}k ${mx.witharayi}.`
            : `Only ${activity.gameSessions7d} game rounds this week.`,
        },
      ),
    );
  }

  const pastRecent = activity.pastPapers[0]?.date === date;
  if (!pastRecent) {
    tasks.push(
      makeTask(
        "past-paper",
        singlish
          ? `${subject} past paper ${mx.ekak} try ${mx.karanna}`
          : `Try a ${subject} past paper`,
        subject,
        {
          why: singlish
            ? activity.pastPapers.length
              ? `Last past paper score ${mx.eka} ${mx.balala} practice ${mx.ona}.`
              : `Past papers ${mx.thawa} start ${mx.startWela} ${mx.nehae}.`
            : activity.pastPapers.length
              ? "Recent past paper score needs more practice."
              : "No past paper yet.",
        },
      ),
    );
  }

  const modelRecent = activity.modelPapers[0]?.date === date;
  if (!modelRecent && activity.pastPapers.length > 0) {
    tasks.push(
      makeTask(
        "model-paper",
        singlish
          ? `${subject} model paper ${mx.ekak} try ${mx.karanna}`
          : `Try a ${subject} model paper`,
        subject,
        {
          why: singlish
            ? `Past paper ${mx.eka} ${mx.gihin} ${mx.nam} model paper ${mx.eken} check ${mx.karanna}.`
            : "After a past paper, a model paper checks exam style.",
        },
      ),
    );
  }

  const hay = note.toLowerCase();
  return tasks
    .filter((item) => {
      if (!hay) return true;
      if (item.kind === "past-paper" && hay.includes("past")) return false;
      if (item.kind === "model-paper" && hay.includes("model")) return false;
      if (item.kind === "game" && (hay.includes("game") || hay.includes("games"))) {
        return false;
      }
      return true;
    })
    .slice(0, 6);
}

export function parsePlanTasks(raw: unknown, language: AppLanguage): StudyTask[] {
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { tasks?: unknown }).tasks)
      ? (raw as { tasks: unknown[] }).tasks
      : [];
  const parsed: StudyTask[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const kind = parseKind(item.kind, title);
    if (!kind || !title) continue;
    parsed.push(
      makeTask(kind, title, String(item.subject || "Mix"), {
        topic: typeof item.topic === "string" ? item.topic : undefined,
        why: typeof item.why === "string" ? item.why : "",
        done: item.done === true,
      }),
    );
  }
  return ensureDailyQuiz(parsed, language);
}

export function ensureDailyQuiz(tasks: StudyTask[], language: AppLanguage) {
  const quiz = tasks.find((item) => item.kind === "daily-quiz");
  const rest = tasks.filter((item) => item.kind !== "daily-quiz");
  const first =
    quiz ||
    makeTask(
      "daily-quiz",
      language === "english"
        ? "Do today's Daily Quiz"
        : `Ada Daily Quiz ${mx.eka} ${mx.karanna}`,
      "Mix",
      {
        why:
          language === "english"
            ? "Daily Quiz is required every day."
            : `${mx.hema} ${mx.dawasama} quiz ${mx.eka} ${mx.thiyenna} ${mx.ona}.`,
      },
    );
  const seen = new Set<string>(["daily-quiz"]);
  const unique = [first];
  for (const item of rest) {
    const key = `${item.kind}:${item.subject}:${item.topic || item.title}`;
    if (seen.has(key) || unique.length >= 6) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function mergeDone(next: StudyTask[], previous: StudyTask[]) {
  const done = new Set(
    previous
      .filter((item) => item.done)
      .map((item) => `${item.kind || "x"}::${item.subject}::${item.topic || ""}`),
  );
  return next.map((item) => ({
    ...item,
    done:
      item.done ||
      done.has(`${item.kind || "x"}::${item.subject}::${item.topic || ""}`),
  }));
}

export function applyActivityDone(tasks: StudyTask[], date = toYmd(new Date())) {
  const activity = collectStudentActivity(date);
  const gameToday = localStore
    .getGameSessions()
    .some((item) => item.createdAt.slice(0, 10) === date);
  return tasks.map((item) => {
    if (item.kind === "daily-quiz" && activity.dailyQuizDoneToday) {
      return { ...item, done: true };
    }
    if (item.kind === "game" && gameToday) return { ...item, done: true };
    if (item.kind === "past-paper" && activity.pastPapers.some((row) => row.date === date)) {
      return { ...item, done: true };
    }
    if (
      item.kind === "model-paper" &&
      activity.modelPapers.some((row) => row.date === date)
    ) {
      return { ...item, done: true };
    }
    return item;
  });
}

export function togglePlanTask(id: string) {
  const plan = loadTaskPlan();
  if (!plan) return [];
  const tasks = plan.tasks.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  );
  saveTaskPlan({ ...plan, tasks });
  return tasks;
}
