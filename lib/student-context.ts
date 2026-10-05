import { z } from "zod";
import {
  educationalLanguageRules,
  parseStudyMedium,
} from "./content-language";
import { TEACHER_PRINCIPLES } from "./teacher-principles";
import type { AppLanguage } from "./copy";
import { localStore } from "./local-store";
import type {
  Profile,
  QuizItem,
  StudyFocus,
  StudyMedium,
} from "./types";
import { collectStudyFocuses } from "./study-chats";
import {
  collectStudentActivity,
  formatStudentActivity,
  type StudentActivity,
} from "./student-activity";
import {
  formatRetrievedSources,
  retrieveSyllabusChunks,
} from "./syllabus-rag";
import { formatSyllabusForAi } from "./syllabus";

export type StudentSnapshot = {
  name: string;
  grade: string;
  subjects: string[];
  medium: StudyMedium;
  recentScores: { topic: string; score: number; date: string }[];
  weakAreas: { label: string; misses: number }[];
  papers: string[];
  noteTopics: string[];
  studyFocus: StudyFocus[];
  activity: StudentActivity;
  sources: { title: string; kind: string; text: string }[];
};

function missCounts(quiz: QuizItem) {
  const counts = new Map<string, number>();
  if (!quiz.answers) {
    if (quiz.score != null && quiz.score < 70 && quiz.topic) {
      counts.set(quiz.topic, 1);
    }
    return counts;
  }
  quiz.questions.forEach((question, index) => {
    if (quiz.answers?.[index] === question.answerIndex) return;
    const label = question.subject || quiz.topic || "General";
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return counts;
}

export function buildStudentSnapshot(
  user: Profile | null,
  query?: string,
): StudentSnapshot {
  const quizzes = localStore.getQuizzes().slice(0, 8);
  const weak = new Map<string, number>();
  for (const quiz of quizzes) {
    for (const [label, count] of missCounts(quiz)) {
      weak.set(label, (weak.get(label) || 0) + count);
    }
  }

  return {
    name: user?.name || "",
    grade: user?.grade || "",
    subjects: user?.subjects || [],
    medium: parseStudyMedium(user?.medium),
    recentScores: quizzes
      .filter((quiz) => quiz.score != null)
      .slice(0, 5)
      .map((quiz) => ({
        topic: quiz.topic,
        score: quiz.score as number,
        date: quiz.createdAt.slice(0, 10),
      })),
    weakAreas: [...weak.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, misses]) => ({ label, misses })),
    papers: localStore
      .getUploads()
      .slice(0, 8)
      .map((item) => item.title || item.fileName),
    noteTopics: [
      ...new Set(
        localStore
          .getNotes()
          .map((note) => note.topic)
          .filter(Boolean),
      ),
    ].slice(0, 8),
    studyFocus: collectStudyFocuses(),
    activity: collectStudentActivity(),
    sources: retrieveSyllabusChunks({
      query:
        query ||
        collectStudyFocuses()
          .map((row) => `${row.subject} ${row.topic}`)
          .join(" "),
      subjects: user?.subjects || [],
      limit: 4,
    }).map((chunk) => ({
      title: chunk.title,
      kind: chunk.kind,
      text: chunk.text.slice(0, 800),
    })),
  };
}

export function formatStudentSnapshot(snapshot: StudentSnapshot) {
  const subjects = snapshot.subjects.length
    ? snapshot.subjects.join(", ")
    : "not set yet";
  const scores = snapshot.recentScores.length
    ? snapshot.recentScores
        .map((row) => `${row.topic} ${row.score}% (${row.date})`)
        .join("; ")
    : "no quiz results yet";
  const weak = snapshot.weakAreas.length
    ? snapshot.weakAreas
        .map((row) => `${row.label} (${row.misses} wrong)`)
        .join("; ")
    : "not enough wrong answers yet";
  const papers = snapshot.papers.length
    ? snapshot.papers.join("; ")
    : "none uploaded";
  const notes = snapshot.noteTopics.length
    ? snapshot.noteTopics.join("; ")
    : "none";
  const study = snapshot.studyFocus.length
    ? snapshot.studyFocus
        .map(
          (row) =>
            `${row.subject} / ${row.topic} / level: ${row.level}`,
        )
        .join("; ")
    : "no study chatbot history yet";

  return [
    `Student name: ${snapshot.name || "unknown"}`,
    `Grade / level: ${snapshot.grade || "unknown"}`,
    `School medium: ${snapshot.medium} (Sinhala / English / Tamil medium in Sri Lanka)`,
    `Subjects they study: ${subjects}`,
    `Recent quiz / paper results: ${scores}`,
    `Weak areas from wrong answers: ${weak}`,
    `Uploaded papers / files: ${papers}`,
    `Saved notes topics: ${notes}`,
    `Study chatbot — subject parts and current level (use this for Daily Quiz): ${study}`,
    snapshot.sources?.length
      ? `Uploaded NIE / teacher-guide chunks in use: ${snapshot.sources
          .map((row) => row.title)
          .join("; ")}`
      : "Uploaded NIE / teacher-guide chunks: none yet",
    formatStudentActivity(snapshot.activity),
  ].join("\n");
}

function syllabusContext(snapshot: StudentSnapshot, query?: string) {
  const map = formatSyllabusForAi({
    grade: snapshot.grade,
    subjects: snapshot.subjects,
    query,
  });
  const sources = formatRetrievedSources(
    (snapshot.sources || []).map((row, index) => ({
      id: String(index),
      sourceId: String(index),
      title: row.title,
      kind:
        row.kind === "teacher-guide" || row.kind === "syllabus"
          ? row.kind
          : "notes",
      subject: "",
      text: row.text,
      createdAt: "",
    })),
  );
  return sources ? `${map}\n\n${sources}` : map;
}

export const studentSnapshotSchema = z.object({
  name: z.string().max(80).optional().default(""),
  grade: z.string().max(40).optional().default(""),
  subjects: z.array(z.string().max(40)).max(20).optional().default([]),
  medium: z.enum(["sinhala", "english", "tamil"]).optional().default("sinhala"),
  recentScores: z
    .array(
      z.object({
        topic: z.string(),
        score: z.number(),
        date: z.string(),
      }),
    )
    .optional()
    .default([]),
  weakAreas: z
    .array(
      z.object({
        label: z.string(),
        misses: z.number(),
      }),
    )
    .optional()
    .default([]),
  papers: z.array(z.string()).optional().default([]),
  noteTopics: z.array(z.string()).optional().default([]),
  studyFocus: z
    .array(
      z.object({
        subject: z.string(),
        topic: z.string(),
        level: z.string(),
      }),
    )
    .optional()
    .default([]),
  activity: z
    .object({
      dailyQuizDoneToday: z.boolean().optional().default(false),
      dailyStreak: z.number().optional().default(0),
      gameSessions7d: z.number().optional().default(0),
      lastGameScore: z.number().nullable().optional().default(null),
      lastGameAt: z.string().nullable().optional().default(null),
      pastPapers: z
        .array(
          z.object({
            subject: z.string(),
            score: z.number(),
            date: z.string(),
          }),
        )
        .optional()
        .default([]),
      modelPapers: z
        .array(
          z.object({
            subject: z.string(),
            score: z.number(),
            date: z.string(),
          }),
        )
        .optional()
        .default([]),
      studyMinutes: z.number().optional().default(0),
      wasteMinutes: z.number().optional().default(0),
      nextExam: z.string().nullable().optional().default(null),
    })
    .optional()
    .default({
      dailyQuizDoneToday: false,
      dailyStreak: 0,
      gameSessions7d: 0,
      lastGameScore: null,
      lastGameAt: null,
      pastPapers: [],
      modelPapers: [],
      studyMinutes: 0,
      wasteMinutes: 0,
      nextExam: null,
    }),
  sources: z
    .array(
      z.object({
        title: z.string().max(160),
        kind: z.string().max(40),
        text: z.string().max(1200),
      }),
    )
    .max(6)
    .optional()
    .default([]),
});

export function parseStudentSnapshot(input: unknown): StudentSnapshot {
  const parsed = studentSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      name: "",
      grade: "",
      subjects: [],
      medium: "sinhala",
      recentScores: [],
      weakAreas: [],
      papers: [],
      noteTopics: [],
      studyFocus: [],
      sources: [],
      activity: {
        dailyQuizDoneToday: false,
        dailyStreak: 0,
        gameSessions7d: 0,
        lastGameScore: null,
        lastGameAt: null,
        pastPapers: [],
        modelPapers: [],
        studyMinutes: 0,
        wasteMinutes: 0,
        nextExam: null,
      },
    };
  }
  return parsed.data;
}

function languageLine(
  language: AppLanguage,
  snapshot: StudentSnapshot,
  jsonOnly: boolean,
) {
  const rules = educationalLanguageRules(snapshot.medium, language, jsonOnly ? "questions" : "chat");
  return jsonOnly ? `${rules}\nReturn only valid JSON.` : rules;
}

function chatLanguageLine(jsonOnly: boolean) {
  const match = `CHAT LANGUAGE: match the student's last message. Sinhala Unicode if they wrote Sinhala. Latin Singlish if they wrote Singlish. English if they wrote English. This overrides other script rules for the teaching reply.`;
  return jsonOnly ? `${match}\nReturn only valid JSON.` : match;
}

export function tutorSystemPrompt(
  language: AppLanguage,
  snapshot: StudentSnapshot,
  query?: string,
) {
  return `${TEACHER_PRINCIPLES}

You are chatting 1:1 with THIS student. Remember the live conversation. Never restart with a generic lesson.
Use their app data and the syllabus map as private knowledge — rewrite, never paste.
If they answered your last guiding question well, take ONE small next step. If they were wrong, nudge gently.
App UI language is ${language}, but the student's last message wins for the reply script.

Student facts:
${formatStudentSnapshot(snapshot)}

${syllabusContext(snapshot, query)}

${chatLanguageLine(false)}`;
}

export function studyChatSystemPrompt(
  language: AppLanguage,
  snapshot: StudentSnapshot,
  query?: string,
  lessonState?: string,
) {
  const lessonBlock = lessonState
    ? `If a lesson snapshot is present, use it as background only. Do not restart the lesson.\n${lessonState}\n`
    : "";
  return `${TEACHER_PRINCIPLES}

CONTINUE THE CHAT:
- The messages array is the live conversation. Use the last several turns. Never restart.
- If they say "that", "ඒක", "previous", or a short answer, it refers to YOUR last guiding question.
- If they asked a question, do NOT dump the final answer. Give the related concept in a bite, then one guiding question that helps them reach it.
- App UI language is ${language}, but the student's last message wins for the reply script.

USE THIS STUDENT'S APP DATA when you guide (do not ignore it):
- Grade, medium, subjects
- Quiz / paper scores and weak areas — if they already missed this idea, explain it more simply
- Notes they saved, uploaded papers, study minutes, games, daily quiz streak

${lessonBlock}
FORBIDDEN:
- Do not ask them to pick a lesson.
- Do not dump textbook pages, OCR, figure numbers, or a 1-2-3 plan.
- Do not announce checkpoints or "unlock next topic".

Return ONLY JSON:
{"reply":"...","focus":{"subject":"Science","topic":"...","level":"some-idea"},"partDone":false,"correct":true,"lessonComplete":false}

The "reply" field MUST follow the four teaching principles.

Student facts:
${formatStudentSnapshot(snapshot)}

${syllabusContext(snapshot, query)}

${chatLanguageLine(true)}`;
}

export function generateSystemPrompt(
  language: AppLanguage,
  snapshot: StudentSnapshot,
) {
  return `You are StudyGenie, this student's personal tutor for Sri Lanka school exams.
Personalize from their results, papers, subjects, weak areas, the Sri Lanka syllabus map, and any uploaded NIE / teacher-guide chunks in the user prompt.
Stay inside those units. Do not invent a different country syllabus.
${languageLine(language, snapshot, true)}`;
}

export function generateUserPrompt(
  type: "notes" | "quiz" | "flashcards",
  topic: string,
  sourceText: string | undefined,
  snapshot: StudentSnapshot,
) {
  const task =
    type === "notes"
      ? `Create short revision notes JSON {"title","body"} for topic: ${topic}. Extra text: ${sourceText || "none"}. Focus on this student's weak areas if they overlap.`
      : type === "quiz"
        ? `Create 5 MCQ JSON {"questions":[{"id","prompt","options","answerIndex","explanation"}]} about ${topic}. Prefer items that drill this student's weak areas. Put the correct option at a random index (0-3), not first every time. Options must be short phrases only. Put the reason only in the "explanation" field (1-2 sentences). Never put the explanation inside an option.`
        : `Create 4 flashcards JSON {"cards":[{"id","front","back","known":false}]} about ${topic}. Prefer this student's weak areas.`;

  return `${task}

Student facts:
${formatStudentSnapshot(snapshot)}

${syllabusContext(snapshot, topic)}`;
}

export function dailyQuizUserPrompt(
  snapshot: StudentSnapshot,
  date: string,
  language: AppLanguage = "singlish",
) {
  const subjects = "Science";
  const langRule = educationalLanguageRules(
    snapshot.medium,
    language,
    "questions",
  );

  const study = snapshot.studyFocus.length
    ? snapshot.studyFocus
        .map((row) => `${row.subject} — ${row.topic} (level: ${row.level})`)
        .join("; ")
    : "none yet";

  return `Create TODAY's personal Daily Quiz for ${date}.
Use the Sri Lanka syllabus map below for unit names and topic points.
Use the student's study chatbot history FIRST: the subject parts they asked about and their current level.
Then use Grade 11 Science results, uploaded Science papers, and weak Science areas.

Study chatbot level / parts (PRIMARY):
${study}

Return ONLY JSON:
{"questions":[{"id":"q1","subject":"Science","prompt":"...","options":["A","B","C","D"],"answerIndex":2,"explanation":"..."}]}

Rules:
- 3 to 5 multiple-choice questions (prefer 3 if few weak topics, else 5)
- All questions MUST be Grade 11 Science only. Do not mix other subjects. Units from: ${subjects}
- If study chatbot history exists, most questions MUST be about those exact parts/topics
- Match their current level: starting/confused = foundations; some-idea = mixed; exam-ready = harder
- Prefer weak syllabus topics when they exist
- 4 options each, one correct. Options are short phrases only — never a paragraph
- Every question MUST include a separate "explanation" field: 1-2 sentences why the correct option is right. Do not start the text with the word Explanation. This is NOT the correct answer itself
- Put the correct option at a RANDOM index (0-3). Do NOT put the correct answer first on every question. Mix 1st/2nd/3rd/4th across the set. answerIndex must match that option.
- School exam style for grade / level: ${snapshot.grade || "unknown"}
- ${langRule}

Student facts:
${formatStudentSnapshot(snapshot)}

${syllabusContext(snapshot, study)}`;
}

export function paperUserPrompt(
  prompt: string,
  count: number,
  subject: string,
  snapshot: StudentSnapshot,
  language: AppLanguage,
) {
  const langRule = educationalLanguageRules(
    snapshot.medium,
    language,
    "questions",
  );

  return `Create a custom exam paper from this student request:
"""${prompt}"""

Subject: ${subject}
Grade / level: ${snapshot.grade || "unknown"}

Return ONLY JSON:
{"questions":[{"id":"q1","subject":"${subject}","prompt":"...","options":["A","B","C","D"],"answerIndex":0,"explanation":"..."}]}

Rules:
- Exactly ${count} multiple-choice questions
- All questions must be about the request above (the hard section / topic they named)
- 4 options each, one correct. Options are short phrases only — never a paragraph
- Every question MUST include a separate "explanation" field: 1-2 sentences why the correct option is right. Do not start the text with the word Explanation. This is not the answer itself
- Put the correct option at a RANDOM index (0-3). Do NOT put the correct answer first on every question.
- answerIndex must be the index of the correct option
- School exam style, a bit challenging if they said it is hard
- Use the Sri Lanka syllabus units below
- ${langRule}

Student facts:
${formatStudentSnapshot(snapshot)}

${syllabusContext(snapshot, `${subject} ${prompt}`)}`;
}

export function dailyTasksUserPrompt(
  snapshot: StudentSnapshot,
  date: string,
  language: AppLanguage,
  note: string,
) {
  const langRule = educationalLanguageRules(snapshot.medium, language, "chat");
  return `Create TODAY's personal study TASK LIST for ${date}.
This is a 1:1 coach plan from THIS student's real work — not a class timetable.

MUST include Daily Quiz every day (kind "daily-quiz"), even if they already did it (mark done true).
Then decide the rest from their data:
- Study chatbot focus / weak areas: which SUBJECT and which PART to learn today (kind "study")
- Games: how many rounds they still need this week (kind "game"). If they already played enough, skip game.
- Past papers: yes or no today (kind "past-paper"). Skip if they did one today or it is too soon.
- Model papers: yes or no today (kind "model-paper"). Skip if not useful yet.
Use quiz scores, paper attempts, game rounds, study time, and exam date.
The whole list should take about 30 minutes. If scores/time show they are slower, keep the 30-minute cap with lighter tasks.

If the student sent a blocker note, CHANGE the plan around that. Example: no time for past papers → drop past-paper, keep Daily Quiz, maybe add a shorter study or game task.
Do not scold. Keep 4 to 6 tasks. First task must be daily-quiz.

Return ONLY JSON:
{"note":"one short coach line","tasks":[{"kind":"daily-quiz","title":"...","subject":"Mix","topic":"","why":"...","done":false},{"kind":"study","title":"...","subject":"Science","topic":"Newton first law","why":"...","done":false}]}

kind must be one of: daily-quiz, study, game, past-paper, model-paper
title = what to do today, in the SAME mixed language as the language rules (Sinhala Unicode + English school words, not Latin Singlish)
why = one short reason from their data, same mixed language
${langRule}

Student blocker / change request:
${note.trim() || "none — make a fresh plan"}

Student facts:
${formatStudentSnapshot(snapshot)}

${syllabusContext(snapshot)}`;
}
