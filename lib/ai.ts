import type { AppLanguage } from "./copy";
import { DAILY_SUBJECTS, shuffleQuestionOptions } from "./daily-questions";
import {
  excerptForQuestion,
  retrieveLessonPartSources,
  type LessonSourceScope,
} from "./science-corpus";
import type { StudentSnapshot } from "./student-context";
import { findSyllabusUnit } from "./syllabus";
import { guessStudyFocus } from "./study-chats";
import { isStudentQuestion } from "./study-progress";
import type { Flashcard, QuizQuestion, StudyFocus } from "./types";

const u = (...codes: number[]) => String.fromCharCode(...codes);
const si = {
  eke: u(0x0d91, 0x0d9a, 0x0dda),
  eka: u(0x0d91, 0x0d9a),
  ekak: u(0x0d91, 0x0d9a, 0x0d9a, 0x0dca),
  eken: u(0x0d91, 0x0d9a, 0x0dd9, 0x0db1, 0x0dca),
  saha: u(0x0dc3, 0x0dc4),
  karanna: u(0x0d9a, 0x0dbb, 0x0db1, 0x0dca, 0x0db1),
  karala: u(0x0d9a, 0x0dbb, 0x0dbd, 0x0dcf),
  ona: u(0x0d95, 0x0db1),
  issella: u(
    0x0d89,
    0x0dc3,
    0x0dca,
    0x0dc3,
    0x0dd9,
    0x0dbd,
    0x0dca,
    0x0dbd,
    0x0dcf,
  ),
  mokada: u(0x0db8, 0x0ddc, 0x0d9a, 0x0daf),
  kiyanne: u(0x0d9a, 0x0dd2, 0x0dba, 0x0db1, 0x0dca, 0x0db1, 0x0dda),
  da: u(0x0daf),
  hoyanna: u(0x0dc4, 0x0ddc, 0x0dba, 0x0db1, 0x0dca, 0x0db1),
  witharak: u(0x0dc0, 0x0dd2, 0x0dad, 0x0dbb, 0x0d9a, 0x0dca),
  witharai: u(0x0dc0, 0x0dd2, 0x0dad, 0x0dbb, 0x0dba, 0x0dd2),
  deka: u(0x0daf, 0x0dd9, 0x0d9a),
  wenawa: u(0x0dc0, 0x0dd9, 0x0db1, 0x0dc0, 0x0dcf),
  hadanna: u(0x0dc4, 0x0daf, 0x0db1, 0x0dca, 0x0db1),
  hadenawa: u(0x0dc4, 0x0dd0, 0x0daf, 0x0dd9, 0x0db1, 0x0dc0, 0x0dcf),
  hari: u(0x0dc4, 0x0dbb, 0x0dd2),
  hariyata: u(0x0dc4, 0x0dbb, 0x0dd2, 0x0dba, 0x0da7),
  nisa: u(0x0db1, 0x0dd2, 0x0dc3, 0x0dcf),
  ho: u(0x0dc4, 0x0ddd),
  hodama: u(0x0dc4, 0x0ddc, 0x0daf, 0x0db8),
  vidiha: u(0x0dc0, 0x0dd2, 0x0daf, 0x0dd2, 0x0dc4),
  ganna: u(0x0d9c, 0x0db1, 0x0dca, 0x0db1),
  nam: u(0x0db1, 0x0db8, 0x0dca),
  wage: u(0x0dc0, 0x0d9c, 0x0dda),
  ayi: u(0x0d87, 0x0dba, 0x0dd2),
  pennanna: u(0x0db4, 0x0dd9, 0x0db1, 0x0dca, 0x0db1, 0x0dca, 0x0db1),
  iwara: u(0x0d89, 0x0dc0, 0x0dbb),
  una: u(0x0d8b, 0x0db1, 0x0dcf),
  walin: u(0x0dc0, 0x0dbd, 0x0dd2, 0x0db1, 0x0dca),
  walata: u(0x0dc0, 0x0dbd, 0x0da7),
  nehae: u(0x0db1, 0x0dd0, 0x0dc4, 0x0dd0),
  enawa: u(0x0d91, 0x0db1, 0x0dc0, 0x0dcf),
  puluwan: u(0x0db4, 0x0dd4, 0x0dc5, 0x0dd4, 0x0dc0, 0x0db1, 0x0dca),
  puluwanda: u(
    0x0db4,
    0x0dd4,
    0x0dc5,
    0x0dd4,
    0x0dc0,
    0x0db1,
    0x0dca,
    0x0daf,
  ),
  ekata: u(0x0d91, 0x0d9a, 0x0da7),
  unoth: u(0x0d8b, 0x0db1, 0x0ddc, 0x0dad, 0x0dca),
  sarala: u(0x0dc3, 0x0dbb, 0x0dbd),
  wala: u(0x0dc0, 0x0dbd),
  ekathu: u(0x0d91, 0x0d9a, 0x0dad, 0x0dd4),
  maga: u(0x0db8, 0x0d9f),
  harinna: u(0x0dc4, 0x0dbb, 0x0dd2, 0x0db1, 0x0dca, 0x0db1),
  bona: u(0x0db6, 0x0ddc, 0x0db1, 0x0dc0, 0x0dcf),
  paata: u(0x0db4, 0x0dcf, 0x0da7),
  nobalanna: u(0x0db1, 0x0ddc, 0x0db6, 0x0dbd, 0x0db1, 0x0dca, 0x0db1),
  amarui: u(0x0d85, 0x0db8, 0x0dcf, 0x0dbb, 0x0dd4, 0x0dba, 0x0dd2),
  onaone: u(0x0d95, 0x0db1, 0x20, 0x0d95, 0x0db1, 0x0dda),
  wenas: u(0x0dc0, 0x0dd9, 0x0db1, 0x0dc3, 0x0dca),
  vidihata: u(0x0dc0, 0x0dd2, 0x0daf, 0x0dd2, 0x0dc4, 0x0da7),
  karaddi: u(0x0d9a, 0x0dbb, 0x0daf, 0x0dca, 0x0daf, 0x0dd3),
  thenum: u(0x0dad, 0x0dda, 0x0db1, 0x0db8, 0x0dca),
  parak: u(0x0db4, 0x0dcf, 0x0dbb, 0x0d9a, 0x0dca),
  liyanakota: u(
    0x0dbd,
    0x0dd2,
    0x0dba,
    0x0db1,
    0x0d9a,
    0x0ddc,
    0x0da7,
  ),
  ahanne: u(0x0d85, 0x0dc4, 0x0db1, 0x0dca, 0x0db1, 0x0dda),
  kohomada: u(0x0d9a, 0x0ddc, 0x0dc4, 0x0ddc, 0x0db8, 0x0daf),
  kiyala: u(0x0d9a, 0x0dd2, 0x0dba, 0x0dbd, 0x0dcf),
  nidimata: u(0x0db1, 0x0dd2, 0x0daf, 0x0dd2, 0x0db8, 0x0da7),
  yanna: u(0x0dba, 0x0db1, 0x0dca, 0x0db1),
  danna: u(0x0daf, 0x0dcf, 0x0db1, 0x0dca, 0x0db1),
  karanawa: u(0x0d9a, 0x0dbb, 0x0db1, 0x0dc0, 0x0dcf),
  thiyenawanam: u(
    0x0dad,
    0x0dd2,
    0x0dba,
    0x0dd9,
    0x0db1,
    0x0dc0,
    0x0db1,
    0x0db8,
    0x0dca,
  ),
  balanawa: u(0x0db6, 0x0dbd, 0x0db1, 0x0dc0, 0x0dcf),
  nathiwa: u(0x0db1, 0x0dd0, 0x0dad, 0x0dd4, 0x0dc0),
  kala: u(0x0d9a, 0x0dc5, 0x0dcf),
  hondayi: u(0x0dc4, 0x0ddc, 0x0db3, 0x0dba, 0x0dd2),
  waradak: u(0x0dc0, 0x0dd0, 0x0dbb, 0x0daf, 0x0dca, 0x0daf, 0x0d9a, 0x0dca),
  thibunoth: u(
    0x0dad,
    0x0dd2,
    0x0db6,
    0x0dd4,
    0x0dab,
    0x0ddc,
    0x0dad,
    0x0dca,
  ),
  kotasa: u(0x0d9a, 0x0ddc, 0x0da7, 0x0dc3),
  thiyagena: u(
    0x0dad,
    0x0dd2,
    0x0dba,
    0x0dcf,
    0x0d9c,
    0x0dd9,
    0x0db1,
  ),
  adu: u(0x0d85, 0x0da9, 0x0dd4),
  ilagata: u(0x0d8a, 0x0dc5, 0x0d9f, 0x0da7),
  genu: u(0x0d9c, 0x0dd9, 0x0db1),
  yamu: u(0x0dba, 0x0db8, 0x0dd4),
  denna: u(0x0daf, 0x0dd9, 0x0db1, 0x0dca, 0x0db1),
  balamu: u(0x0db6, 0x0dbd, 0x0db8, 0x0dd4),
  hema: u(0x0dc4, 0x0dd0, 0x0db8),
  dawasama: u(0x0daf, 0x0dc0, 0x0dc3, 0x0db8),
  thiyenna: u(0x0dad, 0x0dd2, 0x0dba, 0x0dd9, 0x0db1, 0x0dca, 0x0db1),
  ekakata: u(0x0d91, 0x0d9a, 0x0d9a, 0x0da7),
  oyata: u(0x0d94, 0x0dba, 0x0dcf, 0x0da7),
  mathaka: u(0x0db8, 0x0dad, 0x0d9a),
  idiriyata: u(
    0x0d89,
    0x0daf,
    0x0dd2,
    0x0dbb,
    0x0dd2,
    0x0dba,
    0x0da7,
  ),
  kiyanna: u(0x0d9a, 0x0dd2, 0x0dba, 0x0db1, 0x0dca, 0x0db1),
  dapu: u(0x0daf, 0x0dd0, 0x0db4, 0x0dd4),
  liyanna: u(0x0dbd, 0x0dd2, 0x0dba, 0x0db1, 0x0dca, 0x0db1),
  mona: u(0x0db8, 0x0ddc, 0x0db1),
  bhagayak: u(0x0db7, 0x0dcf, 0x0d9c, 0x0dba, 0x0d9a, 0x0dca),
  bhagaya: u(0x0db7, 0x0dcf, 0x0d9c, 0x0dba),
  lavya: u(0x0dbd, 0x0dc0, 0x0dca, 0x200d, 0x0dba),
  haraye: u(0x0dc4, 0x0dbb, 0x0dba, 0x0dda),
  podu: u(0x0db4, 0x0ddc, 0x0daf, 0x0dd4),
  sadhaka: u(0x0dc3, 0x0dcf, 0x0db0, 0x0d9a, 0x0dba),
  beduwama: u(0x0db6, 0x0dd9, 0x0daf, 0x0dd4, 0x0dc0, 0x0db8),
  ganakaya: u(0x0d9c, 0x0dab, 0x0d9a, 0x0dba),
  artha: u(
    0x0d85,
    0x0dbb,
    0x0dca,
    0x0dae,
    0x20,
    0x0daf,
    0x0dd0,
    0x0d9a,
    0x0dca,
    0x0dc0,
    0x0dd3,
    0x0db8,
  ),
  shaka: u(0x0dc1, 0x0dcf, 0x0d9a),
  ahara: u(0x0d86, 0x0dc4, 0x0dcf, 0x0dbb),
  kriyaval: u(
    0x0d9a,
    0x0dca,
    0x200d,
    0x0dbb,
    0x0dd2,
    0x0dba,
    0x0dcf,
    0x0dc0,
    0x0dbd,
    0x0dd2,
    0x0dba,
    0x0d9a,
    0x0dca,
  ),
  hirueliya: u(
    0x0dc4,
    0x0dd2,
    0x0dbb,
    0x0dd4,
    0x20,
    0x0d91,
    0x0dc5,
    0x0dd2,
    0x0dba,
    0x0dd9,
    0x0db1,
    0x0dca,
  ),
  wathura: u(0x0dc0, 0x0dad, 0x0dd4, 0x0dbb),
  pase: u(0x0db4, 0x0dc3, 0x0dda),
  mula: u(0x0db8, 0x0dd4, 0x0dbd, 0x0dca),
  handak: u(0x0dc4, 0x0dac, 0x0d9a, 0x0dca),
  kaalarekha: u(
    0x0d9a,
    0x0dcf,
    0x0dbd,
    0x20,
    0x0dbb,
    0x0dda,
    0x0d9b,
    0x0dcf,
    0x0dc0,
    0x0d9a,
  ),
  dinayak: u(0x0daf, 0x0dd2, 0x0db1, 0x0dba, 0x0d9a, 0x0dca),
  thiyaganna: u(
    0x0dad,
    0x0dd2,
    0x0dba,
    0x0dcf,
    0x0d9c,
    0x0db1,
    0x0dca,
    0x0db1,
  ),
  siddhiya: u(0x0dc3, 0x0dd2, 0x0daf, 0x0dca, 0x0db0, 0x0dd2, 0x0dba),
  hetuwa: u(0x0dc4, 0x0dda, 0x0dad, 0x0dd4, 0x0dc0),
  bandala: u(0x0db6, 0x0dd0, 0x0db3, 0x0dbd, 0x0dcf),
  awurudda: u(0x0d85, 0x0dc0, 0x0dd4, 0x0dbb, 0x0dd4, 0x0daf, 0x0dca, 0x0daf),
  pitapath: u(0x0db4, 0x0dd2, 0x0da7, 0x0db4, 0x0dad, 0x0dca),
  satahan: u(0x0dc3, 0x0da7, 0x0dc4, 0x0db1, 0x0dca),
  sithiyama: u(0x0dc3, 0x0dd2, 0x0dad, 0x0dd2, 0x0dba, 0x0db8),
  akuru: u(0x0d85, 0x0d9a, 0x0dd4, 0x0dbb, 0x0dd4),
  ilakkam: u(0x0d89, 0x0dbd, 0x0d9a, 0x0dca, 0x0d9a, 0x0db8, 0x0dca),
  sanketha: u(0x0dc3, 0x0d82, 0x0d9a, 0x0dda, 0x0dad),
  mishra: u(0x0db8, 0x0dd2, 0x0dc1, 0x0dca, 0x200d, 0x0dbb),
  nama: u(0x0db1, 0x0db8),
  lesi: u(0x0dbd, 0x0dda, 0x0dc3, 0x0dd2),
  his: u(0x0dc4, 0x0dd2, 0x0dc3, 0x0dca),
  ankayak: u(0x0d85, 0x0d82, 0x0d9a, 0x0dba, 0x0d9a, 0x0dca),
  shakthi: u(
    0x0dc1,
    0x0d9a,
    0x0dca,
    0x0dad,
    0x0dd2,
    0x0db8,
    0x0dad,
    0x0dca,
  ),
  wakyak: u(
    0x0dc0,
    0x0dcf,
    0x0d9a,
    0x0dca,
    0x200d,
    0x0dba,
    0x0dba,
    0x0d9a,
  ),
  agata: u(0x0d85, 0x0d9c, 0x0da7),
  purna: u(
    0x0db4,
    0x0dd6,
    0x0dbb,
    0x0dca,
    0x0dab,
    0x20,
    0x0dbd,
    0x0d9a,
    0x0dd4,
    0x0dab,
  ),
  adahasa: u(0x0d85, 0x0daf, 0x0dc4, 0x0dc3),
  makanna: u(0x0db8, 0x0d9a, 0x0db1, 0x0dca, 0x0db1),
  loku: u(0x0dbd, 0x0ddc, 0x0d9a, 0x0dd4),
  idah: u(0x0d89, 0x0da9),
  theeruwa: u(0x0dad, 0x0dd3, 0x0dbb, 0x0dd4, 0x0dc0),
  akurak: u(0x0d85, 0x0d9a, 0x0dd4, 0x0dbb, 0x0d9a, 0x0dca),
  anumana: u(0x0d85, 0x0db1, 0x0dd4, 0x0db8, 0x0dcf, 0x0db1),
  ahambu: u(0x0d85, 0x0dc4, 0x0db9, 0x0dd4),
  chaya: u(
    0x0da1,
    0x0dcf,
    0x0dba,
    0x0dcf,
    0x0dc3,
    0x0d82,
    0x0dc1,
    0x0dca,
    0x200d,
    0x0dbd,
    0x0dda,
    0x0dc2,
    0x0dab,
    0x0dba,
  ),
  murapada: u(0x0db8, 0x0dd4, 0x0dbb, 0x0db4, 0x0daf, 0x0dba),
  ganithaya: u(0x0d9c, 0x0dab, 0x0dd2, 0x0dad, 0x0dba),
  carbon: u(
    0x0d9a,
    0x0dcf,
    0x0db6,
    0x0db1,
    0x0dca,
    0x20,
    0x0da9,
    0x0dba,
    0x0ddc,
    0x0d9a,
    0x0dca,
    0x0dc3,
    0x0dba,
    0x0dd2,
    0x0da9,
    0x0dca,
  ),
};

function gloss(english: string, sinhala: string) {
  return `${english} (${sinhala})`;
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function coachingFocus(question: string, snapshot?: StudentSnapshot) {
  const weak = snapshot?.weakAreas[0]?.label;
  if (weak) return weak;
  if (snapshot?.subjects.length) return snapshot.subjects.join(", ");
  return question.trim();
}

export function mockTutorReply(
  question: string,
  language: AppLanguage = "singlish",
  snapshot?: StudentSnapshot,
) {
  const focus =
    coachingFocus(question, snapshot) ||
    (language === "english" ? "your next topic" : "oyage next topic");
  const paper = snapshot?.papers[0];
  const scoreLine = snapshot?.recentScores[0]
    ? `${snapshot.recentScores[0].topic} ${snapshot.recentScores[0].score}%`
    : "";

  if (language === "english") {
    return [
      `This is a personal coaching note, not a class syllabus.`,
      scoreLine ? `Latest result: ${scoreLine}.` : "",
      paper ? `From your papers: ${paper}.` : "",
      `Let's fix "${focus}".`,
      "",
      "1. Concept: write one clear definition and one example.",
      "2. Why: exams give marks when you explain the reason.",
      "3. Practice: try a similar question from your papers and recall key words with flashcards.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `Class syllabus \u0d91\u0d9a nemei \u2014 \u0d94\u0dba\u0dcf\u0d9c\u0dda weak area \u0d91\u0d9a\u0d9a\u0dca teach \u0d9a\u0dbb\u0db1\u0dca\u0db1\u0db8\u0dca.`,
    scoreLine ? `Latest result: ${scoreLine}.` : "",
    paper ? `Papers: ${paper}.` : "",
    `"${focus}" \u0d9c\u0dd0\u0db1 simple \u0dc0\u0dd2\u0daf\u0dd2\u0dc4\u0da7 \u0d9a\u0dd2\u0dba\u0db1\u0dca\u0db1\u0db8\u0dca.`,
    "",
    "1. Concept \u0d91\u0d9a: first idea \u0d91\u0d9a clear \u0d9a\u0dbb\u0db1\u0dca\u0db1 \u2014 definition \u0d91\u0d9a \u0dbd\u0dd2\u0dba\u0dbd\u0dcf, example \u0d91\u0d9a\u0d9a\u0dca \u0daf\u0dcf\u0db1\u0dca\u0db1.",
    "2. Why \u0d91\u0d9a: exam \u0d91\u0d9a\u0dda mark \u0d91\u0db1\u0dca\u0db1\u0dda reason \u0d91\u0d9a explain \u0d9a\u0dbb\u0db4\u0dd4 \u0db1\u0dd2\u0dc3.",
    "3. Practice: papers / similar question \u0d91\u0d9a\u0d9a\u0dca try \u0d9a\u0dbb\u0db1\u0dca\u0db1, flashcards \u0dc0\u0dbd\u0dd2\u0db1\u0dca keywords recall \u0d9a\u0dbb\u0db1\u0dca\u0db1.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type AiHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

function cleanLessonExcerpt(text: string) {
  const body = text.replace(/\s+/g, " ").replace(/\sx\s+/g, "\n• ").trim();
  const bullet = body.indexOf("• ");
  const from = bullet >= 0 && bullet < 120 ? body.slice(bullet) : body;
  return from.slice(0, 420).trim();
}

function lessonFromKickoff(text: string) {
  const topicLine = text.match(/Topics:\s*(.+?)(?:\.\s+NOW:|\.\s+Progress|$)/i)?.[1] || "";
  const topics = topicLine
    .split(/[·,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const unit =
    text.match(/^LESSON\s+(.+?)\.\s+(?:Grade|Topics:)/i)?.[1]?.trim() ||
    text.match(/^LESSON\s+(.+)$/im)?.[1]?.trim() ||
    text.match(/^(.+?)\s+පාඩම/u)?.[1]?.trim() ||
    topics[0] ||
    "Science";
  return {
    unit,
    first: topics[0] || unit,
    query: [unit, ...topics].join(" "),
  };
}

function teachFromCorpus(
  question: string,
  language: AppLanguage,
  focus: StudyFocus,
  partIndex = 0,
): { reply: string; focus: StudyFocus } | null {
  const lesson = lessonFromKickoff(question);
  const pages = retrieveLessonPartSources(lesson.query || question);
  const textbook = pages.filter((item) => item.doc_type === "textbook");
  const guide = pages.filter((item) => item.doc_type === "teachers_guide");
  const pool = textbook.length ? textbook : pages;
  const book = pool[Math.min(partIndex, Math.max(pool.length - 1, 0))];
  const bookText = cleanLessonExcerpt(book?.content || "");
  const guideText = cleanLessonExcerpt(guide[0]?.content || "").slice(0, 220);
  if (!bookText && !guideText) return null;
  const topic = lesson.first;
  if (language === "english") {
    return {
      reply: [
        `Grade 11 Science — ${lesson.unit}. Part: ${topic}.`,
        bookText,
        guideText ? `Teacher guide: ${guideText}` : "",
        `Check: In one sentence, what is ${topic}?`,
        "Ask me one question you have about this part.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      focus: { ...focus, subject: "Science", topic },
    };
  }
  return {
    reply: [
      `Grade 11 Science — ${lesson.unit}. ${si.kotasa}: ${topic}.`,
      bookText,
      guideText ? `Teacher guide: ${guideText}` : "",
      `Check: ${topic} ${si.mokada} ${si.kiyanne}? ${si.eka} sentence ${si.eken} ${si.kiyanna}.`,
      `${si.oyata} question ${si.ekak} ${si.thiyenawanam} type ${si.karanna}.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    focus: { ...focus, subject: "Science", topic },
  };
}

export type StudyLessonHint = {
  unitId: string;
  title: string;
  parts: string[];
  currentIndex: number;
  kind?: "start" | "question" | "answer";
};

export function mockStudyReply(
  question: string,
  language: AppLanguage = "singlish",
  snapshot?: StudentSnapshot,
  history: AiHistoryTurn[] = [],
  lessonHint?: StudyLessonHint,
): { reply: string; focus: StudyFocus } {
  const asked =
    lessonHint?.kind === "question" || isStudentQuestion(question);
  const mapped = lessonHint ? findSyllabusUnit(lessonHint.unitId) : null;
  const part =
    lessonHint?.parts[lessonHint.currentIndex] ||
    lessonFromKickoff(question).first;
  const title = lessonHint?.title || "";
  const scope: LessonSourceScope | undefined = mapped
    ? {
        book: mapped.book,
        pageStart: mapped.pageStart,
        pageEnd: mapped.pageEnd,
      }
    : undefined;
  const excerpt = excerptForQuestion(
    [title, part, question].filter(Boolean).join(" "),
    scope,
  );
  if (excerpt) {
    const focus = {
      subject: "Science",
      topic: part,
      level: asked ? "some-idea" : "confused",
    } satisfies StudyFocus;
    if (asked) {
      if (language === "english") {
        return {
          reply: `Start with the idea behind ${part}, not the full answer. What do you already think this is for?`,
          focus,
        };
      }
      return {
        reply: `${part} ගැන මුලින්ම එක අදහසක් හිතමු — පූර්ණ උත්තරේ දැන් ඕන නෑ. ඔයාට මේකෙන් මතක තියෙන්නේ මොකක්ද?`,
        focus,
      };
    }
    if (language === "english") {
      return {
        reply: `Let's take ${title || part} one small idea at a time. What part of this still feels unclear?`,
        focus,
      };
    }
    return {
      reply: `${title || part} ගැන එක පොඩි අදහසකින් පටන් ගමු. ඔයාට මේකෙන් අමාරුම ටික මොකක්ද?`,
      focus,
    };
  }

  const lesson = lessonFromKickoff(question);
  const focus = {
    ...guessStudyFocus(
      [...history.map((turn) => turn.content), question].join(" "),
      snapshot?.subjects,
    ),
    subject: "Science",
    topic: part || lesson.first,
  };
  const priorAssistant = [...history]
    .reverse()
    .find((turn) => turn.role === "assistant");
  const answering = Boolean(priorAssistant) && history.length >= 2;
  const firstUser =
    history.find((turn) => turn.role === "user")?.content || question;
  const seed =
    [question, ...history.map((turn) => turn.content)].find(
      (text) => /^LESSON\s+/i.test(text) || /Topics:/i.test(text),
    ) || `LESSON ${firstUser}. Topics: ${lesson.first || firstUser}.`;
  const taught = teachFromCorpus(
    seed,
    language,
    answering ? { ...focus, level: "some-idea" } : focus,
    answering ? 1 : 0,
  );
  if (taught) {
    if (asked) {
      return {
        reply:
          language === "english"
            ? `Hold the full answer for a moment. What do you already know about ${focus.topic}?`
            : `${focus.topic} ගැන පූර්ණ උත්තරේ දැන් දෙන්න එපා. ඔයාට මේකෙන් දැනට තේරෙන ටික මොකක්ද?`,
        focus: taught.focus,
      };
    }
    if (!answering) return taught;
    if (language === "english") {
      return {
        reply: `Good try.\n\n${taught.reply}`,
        focus: taught.focus,
      };
    }
    return {
      reply: `${si.hondayi}.\n\n${taught.reply}`,
      focus: taught.focus,
    };
  }

  if (language === "english") {
    if (answering) {
      return {
        reply: `I can teach in your words. What part of ${focus.topic} still feels fuzzy? Ask it like you would ask a friend.`,
        focus: { ...focus, level: "some-idea" },
      };
    }
    const weak = snapshot?.weakAreas[0]?.label;
    return {
      reply: weak
        ? `We can start anywhere. Your quizzes look a bit shaky on ${weak} — want to open with that, or something else on your mind?`
        : `I can talk through ${focus.subject} with you. What do you want to understand first?`,
      focus,
    };
  }

  if (answering) {
    return {
      reply: `${focus.topic} ගැන තවත් ටිකක් කතා කරමු. ඔයාට තේරුණේ නැති ටිකක් ඔයාගේ වචනෙන් අහන්න.`,
      focus: { ...focus, level: "some-idea" },
    };
  }

  const weak = snapshot?.weakAreas[0]?.label;
  return {
    reply: weak
      ? `ඕකේ, කතා කරල උගන්නම්. Quiz වල ${weak} ටිකට අමාරු වෙලා තියෙනවා වගේ — ඒකද බලමුද, නැත්නම් ඔයාට ඕන කොටසද?`
      : `ඕකේ. ${focus.subject} ගැන යාළුවෙක් වගේ කතා කරල කියල දෙන්නම්. මුලින්ම මොකක්ද තේරගන්න ඕන?`,
    focus,
  };
}

export function mockNotes(
  topic: string,
  sourceText?: string,
  language: AppLanguage = "singlish",
) {
  if (language === "english") {
    const extra = sourceText?.trim()
      ? `\n\nKey points from your text:\n- ${sourceText.slice(0, 180)}`
      : "";
    return {
      title: `${topic} — short notes`,
      body: [
        `${topic} is ready for revision.`,
        "",
        "Key points",
        `- Write what ${topic} means in one sentence.`,
        "- Turn 3-5 main terms into flashcards.",
        "- Common exam mistake: giving an example without a definition.",
        "",
        "Mini plan",
        "1. Definition + 1 example",
        "2. Diagram or steps (if science / maths)",
        "3. Try one past question",
        extra,
      ].join("\n"),
    };
  }

  const extra = sourceText?.trim()
    ? `\n\n${si.oyata} ${si.dapu} text ${si.eken} key points:\n- ${sourceText.slice(0, 180)}`
    : "";

  return {
    title: `${topic} — short notes`,
    body: [
      `${topic} lesson \u0d91\u0d9a revision \u0d91\u0d9a\u0da7 ready.`,
      "",
      "Key points",
      `- ${topic} \u0d9a\u0dd2\u0dba\u0db1\u0dca\u0db1\u0dda \u0db8\u0ddc\u0db1 idea \u0d91\u0d9a\u0d9a\u0dca\u0daf \u0d9a\u0dd2\u0dba\u0dbd 1 sentence \u0d91\u0d9a\u0dd9\u0db1\u0dca \u0dbd\u0dd2\u0dba\u0db1\u0dca\u0db1.`,
      "- Main terms 3-5k flashcards \u0dc0\u0dd2\u0daf\u0dd2\u0dc4\u0da7 \u0dc4\u0daf\u0db1\u0dca\u0db1.",
      "- Exam \u0d91\u0d9a\u0dda common mistake \u0d91\u0d9a: definition \u0d91\u0d9a \u0db1\u0dd0\u0dad\u0dd4\u0dc0 example witharai \u0dbd\u0dd2\u0dba\u0db1\u0dc0\u0dcf.",
      "",
      "Mini plan",
      "1. Definition + 1 example",
      "2. Diagram or steps (if science / maths)",
      "3. Past question \u0d91\u0d9a\u0d9a\u0dca try \u0d9a\u0dbb\u0db1\u0dca\u0db1",
      extra,
    ].join("\n"),
  };
}

export function mockQuiz(
  topic: string,
  language: AppLanguage = "singlish",
): QuizQuestion[] {
  if (language === "english") {
    return [
      {
        id: id("q"),
        prompt: `What is the first step when studying ${topic}?`,
        options: [
          "Make the definition clear",
          "Only try random past papers",
          "Skip the notes",
          "Scroll on your phone",
        ],
        answerIndex: 0,
        explanation:
          "If the concept is clear, quizzes and past papers become easier.",
      },
      {
        id: id("q"),
        prompt: `What is the best way to remember a key term in ${topic}?`,
        options: [
          "Read it only once",
          "Try recall with a flashcard",
          "Only highlight it",
          "Ignore it",
        ],
        answerIndex: 1,
        explanation: "Active recall with flashcards makes memory stronger.",
      },
      {
        id: id("q"),
        prompt: `What should an exam answer on ${topic} include?`,
        options: [
          "A joke",
          "Definition + reason + example",
          "Only emojis",
          "Copy the question",
        ],
        answerIndex: 1,
        explanation: "Marking schemes look for definition, reason, and example.",
      },
      {
        id: id("q"),
        prompt: `If ${topic} is confusing, how should you ask the AI Tutor?`,
        options: [
          "Ask a vague question",
          "Mention the exact step, formula, or paragraph",
          "Say sorry and stop",
          "Change the topic",
        ],
        answerIndex: 1,
        explanation: "A specific question gets a targeted explanation.",
      },
      {
        id: id("q"),
        prompt: `What is a good check after revising ${topic}?`,
        options: [
          "Close the book and sleep",
          "5 MCQs + 3 flashcard recalls",
          "Take a screenshot of notes",
          "Post a meme in group chat",
        ],
        answerIndex: 1,
        explanation: "A short test plus recall measures real progress.",
      },
    ].map(shuffleQuestionOptions);
  }

  return [
    {
      id: id("q"),
      prompt: `${topic} study ${si.karaddi} ${si.issella} ${si.mona} step ${si.eka} ${si.da}?`,
      options: [
        `Definition ${si.eka} clear ${si.karanna}`,
        `Past paper ${si.witharai} random try ${si.karanna}`,
        `Notes skip ${si.karanna}`,
        `Phone ${si.eke} scroll ${si.karanna}`,
      ],
      answerIndex: 0,
      explanation: `Concept ${si.eka} ${si.hariyata} ${si.thenum} ${si.nam}, quiz ${si.saha} past papers easy ${si.wenawa}.`,
    },
    {
      id: id("q"),
      prompt: `${topic} ${si.eke} key term ${si.ekak} remember ${si.karanna} ${si.hodama} ${si.vidiha}?`,
      options: [
        `${si.eka} ${si.parak} ${si.witharak} read ${si.karanna}`,
        `Flashcard ${si.eken} recall try ${si.karanna}`,
        `Highlight ${si.witharai} ${si.karanna}`,
        `Ignore ${si.karanna}`,
      ],
      answerIndex: 1,
      explanation: `Active recall (flashcards) memory ${si.eka} strong ${si.karanawa}.`,
    },
    {
      id: id("q"),
      prompt: `Exam answer ${si.ekak} ${si.liyanakota} ${topic} ${si.eke} ${si.mokada} include ${si.karanna} ${si.ona}?`,
      options: [
        `Joke ${si.ekak}`,
        "Definition + reason + example",
        `Emoji ${si.witharai}`,
        `Question ${si.eka} copy ${si.karanna}`,
      ],
      answerIndex: 1,
      explanation: `Marking scheme ${si.eke} definition, reason, example ${si.balanawa}.`,
    },
    {
      id: id("q"),
      prompt: `${topic} confusion ${si.unoth} AI Tutor ${si.ekata} ${si.kohomada} ${si.ahanne}?`,
      options: [
        `Question ${si.eka} vague ${si.vidihata}`,
        `Exact step / formula / paragraph ${si.eka} mention ${si.karala}`,
        `Sorry ${si.kiyala} stop ${si.wenawa}`,
        `Topic ${si.eka} change ${si.karanna}`,
      ],
      answerIndex: 1,
      explanation: `Specific question ${si.nam}, explanation ${si.eka} target ${si.wenawa}.`,
    },
    {
      id: id("q"),
      prompt: `Revision session ${si.eka} ${topic} ${si.walata} finish ${si.karanna} ${si.hodama} check ${si.eka}?`,
      options: [
        `Book close ${si.karala} ${si.nidimata} ${si.yanna}`,
        "5 MCQ + 3 flashcards recall",
        `Notes screenshot ${si.ekak} ${si.ganna}`,
        `Group chat ${si.eke} meme ${si.danna}`,
      ],
      answerIndex: 1,
      explanation: `Short test + recall ${si.kiyanne} progress ${si.eka} measure ${si.karanna} ${si.vidiha}.`,
    },
  ].map(shuffleQuestionOptions);
}

export function mockPaper(
  topic: string,
  count: number,
  language: AppLanguage = "singlish",
  subject = "Science",
): QuizQuestion[] {
  const n = Math.min(20, Math.max(1, Math.round(count) || 10));
  const bank =
    language === "english"
      ? mockQuiz(topic, "english")
      : mockDailyQuiz("singlish", [subject]);
  return Array.from({ length: n }, (_, index) => {
    const row = bank[index % bank.length];
    return {
      ...row,
      id: id("p"),
      subject,
      prompt: `${topic} (${index + 1}): ${row.prompt}`,
    };
  });
}

export function mockFlashcards(
  topic: string,
  language: AppLanguage = "singlish",
): Flashcard[] {
  if (language === "english") {
    return [
      {
        id: id("c"),
        front: `${topic} — 1 sentence definition`,
        back: `${topic} is the core idea. Practice writing it in your own words.`,
        known: false,
      },
      {
        id: id("c"),
        front: `${topic} — common exam ask`,
        back: "Define + explain with an example. Label the diagram if there is one.",
        known: false,
      },
      {
        id: id("c"),
        front: `${topic} — common mistake`,
        back: "Mixing terms or skipping units / steps. Use a checklist.",
        known: false,
      },
      {
        id: id("c"),
        front: `${topic} — revision prompt`,
        back: "Close the book and try to explain the concept in 60 seconds.",
        known: false,
      },
    ];
  }

  return [
    {
      id: id("c"),
      front: `${topic} — 1 sentence definition`,
      back: `${topic} ${si.kiyanne} core idea ${si.eka}. Own words ${si.walin} ${si.liyanna} practice ${si.karanna}.`,
      known: false,
    },
    {
      id: id("c"),
      front: `${topic} — exam ${si.eke} frequent ask ${si.eka}`,
      back: `Define + explain with example. Diagram ${si.thiyenawanam} label ${si.karanna}.`,
      known: false,
    },
    {
      id: id("c"),
      front: `${topic} — common mistake`,
      back: `Terms mix ${si.karanawa}, units / steps skip ${si.karanawa}. Checklist ${si.ekak} use ${si.karanna}.`,
      known: false,
    },
    {
      id: id("c"),
      front: `${topic} — revision prompt`,
      back: `Book close ${si.karala}, 60 seconds ${si.walin} concept ${si.eka} ${si.kiyanna} try ${si.karanna}.`,
      known: false,
    },
  ];
}

export function parseAiJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced?.[1] || trimmed).trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // try array below
      }
    }
    const aStart = text.indexOf("[");
    const aEnd = text.lastIndexOf("]");
    if (aStart >= 0 && aEnd > aStart) {
      try {
        return JSON.parse(text.slice(aStart, aEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function mockDailyQuiz(
  language: AppLanguage = "singlish",
  subjects: string[] = [...DAILY_SUBJECTS],
): QuizQuestion[] {
  const mix = subjects.length ? subjects.slice(0, 5) : [...DAILY_SUBJECTS];
  while (mix.length < 5) {
    mix.push(DAILY_SUBJECTS[mix.length % DAILY_SUBJECTS.length]);
  }

  const englishBank: Record<
    string,
    { prompt: string; options: string[]; explanation: string }
  > = {
    Maths: {
      prompt: "What should you do first when simplifying a fraction?",
      options: [
        "Find a common factor of the numerator and denominator",
        "Add the two numbers at random",
        "Skip the definition",
        "Use a calculator only",
      ],
      explanation: "Dividing by a common factor makes the fraction simpler.",
    },
    Science: {
      prompt: "What happens in photosynthesis?",
      options: [
        "Plants make food using sunlight",
        "Plants only drink water",
        "Soil changes colour by itself",
        "Roots make a sound",
      ],
      explanation: "Plants make food from sunlight, water, and carbon dioxide.",
    },
    English: {
      prompt: "What is the subject of a sentence?",
      options: [
        "The person or thing doing the action",
        "Only the full stop",
        "The page number",
        "The last word in a dictionary",
      ],
      explanation: "The subject is who or what does the action.",
    },
    Sinhala: {
      prompt: "Why does a sentence need a full stop at the end?",
      options: [
        "To show the idea is finished",
        "To delete a letter",
        "To press space bar only",
        "To remove capital letters",
      ],
      explanation: "A full stop shows that one idea has ended.",
    },
    History: {
      prompt: "What is the best way to remember a date on a timeline?",
      options: [
        "Link the event with its reason",
        "Copy the year only",
        "Skip the notes",
        "Ignore the map",
      ],
      explanation: "A date sticks when it is tied to what happened and why.",
    },
    ICT: {
      prompt: "What makes a password stronger?",
      options: [
        "A mix of letters, numbers, and symbols",
        "Your name only",
        "An easy number like 1234",
        "A blank password",
      ],
      explanation: "Mixing letters, numbers, and symbols is harder to guess.",
    },
    Tamil: {
      prompt: "ஒரு வாக்கியத்தின் இறுதியில் முற்றுப்புள்ளி ஏன் தேவை?",
      options: [
        "கருத்து முடிந்ததைக் காட்ட",
        "ஒரு எழுத்தை நீக்க",
        "space bar மட்டும்",
        "capital letters அகற்ற",
      ],
      explanation: "முற்றுப்புள்ளி ஒரு கருத்து முடிந்ததைக் காட்டும்.",
    },
  };

  const singlishBank: Record<
    string,
    { prompt: string; options: string[]; explanation: string }
  > = {
    Maths: {
      prompt: `${gloss("Maths", si.ganithaya)} ${si.eke} ${si.bhagayak} ${si.sarala} ${si.karanna} ${si.issella} ${si.mokada} ${si.karanna} ${si.ona}?`,
      options: [
        `${si.lavya} ${si.saha} ${si.haraye} ${si.podu} ${si.sadhaka} ${si.hoyanna}`,
        `${si.ilakkam} ${si.deka} ${si.onaone} ${si.ekathu} ${si.karanna}`,
        `${si.artha} ${si.maga} ${si.harinna}`,
        `${si.ganakaya} ${si.witharak} ${si.ganna}`,
      ],
      explanation: `${si.podu} ${si.sadhaka} ${si.eken} ${si.beduwama} ${si.bhagaya} ${si.sarala} ${si.wenawa}.`,
    },
    Science: {
      prompt: `${gloss("Photosynthesis", si.chaya)} ${si.kiyanne} ${si.shaka} ${si.mokada} ${si.hadenawa} ${si.kiyanne} ${si.kriyaval}${si.da}?`,
      options: [
        `${si.hirueliya} ${si.ahara} ${si.hadenawa}`,
        `${si.wathura} ${si.witharak} ${si.bona}`,
        `${si.pase} ${si.paata} ${si.wenas} ${si.wenawa}`,
        `${si.mula} ${si.walin} ${si.handak} ${si.enawa}`,
      ],
      explanation: `${si.shaka} ${si.hirueliya}, ${si.wathura}, ${si.saha} ${gloss("CO2", si.carbon)} ${si.eken} ${si.ahara} ${si.hadenawa}.`,
    },
    English: {
      prompt: "What is the subject of a sentence?",
      options: [
        "The person or thing doing the action",
        "Only the full stop",
        "The page number",
        "The last word in a dictionary",
      ],
      explanation: "The subject is who or what does the action.",
    },
    Sinhala: {
      prompt: `${si.wakyak} ${si.agata} ${si.purna} ${si.ona} ${si.wenawa} ${si.ayi}?`,
      options: [
        `${si.adahasa} ${si.eka} ${si.iwara} ${si.una} ${si.kiyanne} ${si.pennanna}`,
        `${si.akurak} ${si.makanna}`,
        `${si.idah} ${si.theeruwa} ${si.witharak}`,
        `${si.loku} ${si.akuru} ${si.maga} ${si.harinna}`,
      ],
      explanation: `${si.purna} ${si.eken} ${si.adahasa} ${si.eka} ${si.iwara} ${si.una} ${si.kiyanne} ${si.pennanna} ${si.puluwan}.`,
    },
    Tamil: {
      prompt: "ஒரு வாக்கியத்தின் இறுதியில் முற்றுப்புள்ளி ஏன் தேவை?",
      options: [
        "கருத்து முடிந்ததைக் காட்ட",
        "ஒரு எழுத்தை நீக்க",
        "space bar மட்டும்",
        "capital letters அகற்ற",
      ],
      explanation: "முற்றுப்புள்ளி ஒரு கருத்து முடிந்ததைக் காட்டும்.",
    },
    History: {
      prompt: `${si.kaalarekha} ${si.dinayak} ${si.mathaka} ${si.thiyaganna} ${si.hodama} ${si.vidiha} ${si.mokada}?`,
      options: [
        `${si.siddhiya} ${si.saha} ${si.hetuwa} ${si.bandala}`,
        `${si.awurudda} ${si.witharak} ${si.pitapath} ${si.karanna}`,
        `${si.satahan} ${si.maga} ${si.harinna}`,
        `${si.sithiyama} ${si.nobalanna}`,
      ],
      explanation: `${si.dinayak} ${si.siddhiya} ${si.saha} ${si.hetuwa} ${si.ekata} ${si.bandala} ${si.unoth} ${si.mathaka} ${si.thiyaganna} ${si.puluwan}.`,
    },
    ICT: {
      prompt: `${gloss("Password", si.murapada)} ${si.ekak} ${si.shakthi} ${si.karanna} ${si.ona} ${si.nam} ${si.mokada} ${si.ganna} ${si.ona}?`,
      options: [
        `${si.akuru}, ${si.ilakkam}, ${si.saha} ${si.sanketha} ${si.mishra} ${si.karanna}`,
        `${si.nama} ${si.eka} ${si.witharak}`,
        `1234 ${si.wage} ${si.lesi} ${si.ankayak}`,
        `${si.his} ${gloss("Password", si.murapada)} ${si.ekak}`,
      ],
      explanation: `${si.akuru}, ${si.ilakkam}, ${si.saha} ${si.sanketha} ${si.mishra} ${si.unoth} ${si.anumana} ${si.karanna} ${si.amarui}.`,
    },
  };

  return mix.slice(0, 5).map((subject) => {
    const bank = language === "english" ? englishBank : singlishBank;
    const item =
      bank[subject] ||
      (language === "english"
        ? {
            prompt: `What is the first step when revising ${subject}?`,
            options: [
              "Write a clear definition",
              "Skip the notes",
              "Only guess at random",
              "Change the subject",
            ],
            explanation: `Start ${subject} with a definition, then practise the weak part.`,
          }
        : {
            prompt: `${subject} ${si.eke} ${si.artha} ${si.hari} ${si.vidihata} ${si.kiyanne} ${si.mokada}?`,
            options: [
              `${si.hari} ${si.wakyak} ${si.karala} ${si.kiyanne}`,
              `${si.satahan} ${si.maga} ${si.harinna}`,
              `${si.ahambu} ${si.kiyanne} ${si.witharak}`,
              `${subject} ${si.eka} ${si.wenas} ${si.karanna}`,
            ],
            explanation: `${subject} ${si.eke} ${si.artha} clear ${si.unoth} ${si.lesi} ${si.wenawa}.`,
          });

    return shuffleQuestionOptions({
      id: id("daily"),
      subject,
      prompt: item.prompt,
      options: item.options,
      answerIndex: 0,
      explanation: item.explanation,
    });
  });
}

export function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY);
}

function isGeminiKey(key: string, base: string) {
  return (
    base.includes("generativelanguage.googleapis.com") ||
    key.startsWith("AIza") ||
    key.startsWith("AQ.")
  );
}

function geminiModels() {
  const preferred = process.env.AI_MODEL?.trim();
  const rest = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ];
  return [...new Set([preferred, ...rest].filter(Boolean) as string[])];
}

export async function completeWithAi(
  system: string,
  userOrHistory: string | AiHistoryTurn[],
  timeoutMs = 55_000,
  temperature = 0.5,
  json = false,
) {
  const key = process.env.AI_API_KEY;
  if (!key) return null;

  const configuredBase = (
    process.env.AI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const gemini = isGeminiKey(key, configuredBase);
  const base = gemini
    ? "https://generativelanguage.googleapis.com/v1beta/openai"
    : configuredBase;
  const models = gemini
    ? geminiModels()
    : [process.env.AI_MODEL || "gpt-4o-mini"];

  const history: AiHistoryTurn[] =
    typeof userOrHistory === "string"
      ? [{ role: "user", content: userOrHistory }]
      : userOrHistory.filter((turn) => turn.content.trim());

  if (!history.length) return null;

  let lastError = "";
  for (const model of models) {
    const jsonModes = json ? [true, false] : [false];
    for (const jsonMode of jsonModes) {
      const payload = JSON.stringify({
        model,
        temperature,
        messages: [{ role: "system", content: system }, ...history],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      });
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          signal: AbortSignal.timeout(timeoutMs),
          body: payload,
        });
        if (res.ok) {
          const body = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          return body.choices?.[0]?.message?.content?.trim() || "";
        }
        lastError = await res.text();
        const busy = res.status === 429 || res.status === 503;
        if (!busy) break;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }
  }
  throw new Error(lastError.slice(0, 300));
}

function readGeminiText(json: {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
}) {
  const parts = json.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function completeWithGeminiMedia(
  prompt: string,
  bytes: Uint8Array,
  mime: string,
  timeoutMs = 85_000,
  temperature = 0,
  json = false,
  systemInstruction?: string,
) {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const configuredBase = (
    process.env.AI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  if (!isGeminiKey(key, configuredBase)) return null;

  const b64 = Buffer.from(bytes).toString("base64");
  let lastError = "";
  const authHeaders = [
    { Authorization: `Bearer ${key}` },
    { "x-goog-api-key": key },
  ];
  const jsonModes = json ? [true, false] : [false];
  const extraConfigs: Record<string, unknown>[] = [
    {
      thinkingConfig: { thinkingBudget: 0 },
      mediaResolution: "MEDIA_RESOLUTION_HIGH",
      topK: 1,
      topP: 0,
    },
    {
      thinkingConfig: { thinkingBudget: 0 },
      topK: 1,
      topP: 0,
    },
    {},
  ];
  for (const model of geminiModels()) {
    for (const extra of authHeaders) {
      for (const jsonMode of jsonModes) {
        for (const extraConfig of extraConfigs) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...extra,
                },
                signal: AbortSignal.timeout(timeoutMs),
                body: JSON.stringify({
                  ...(systemInstruction
                    ? {
                        systemInstruction: {
                          parts: [{ text: systemInstruction }],
                        },
                      }
                    : {}),
                  generationConfig: {
                    temperature,
                    maxOutputTokens: 8192,
                    ...extraConfig,
                    ...(jsonMode
                      ? { responseMimeType: "application/json" }
                      : {}),
                  },
                  contents: [
                    {
                      role: "user",
                      parts: [
                        { inlineData: { mimeType: mime, data: b64 } },
                        { text: prompt },
                      ],
                    },
                  ],
                }),
              },
            );
            if (res.ok) {
              const jsonBody = (await res.json()) as Parameters<
                typeof readGeminiText
              >[0];
              const text = readGeminiText(jsonBody);
              if (text) return text;
              lastError = "empty-parts";
              continue;
            }
            lastError = await res.text();
            if (res.status === 401 || res.status === 403) break;
          } catch (error) {
            lastError = error instanceof Error ? error.message : "media";
          }
        }
      }
    }
  }
  if (lastError) throw new Error(lastError.slice(0, 300));
  return null;
}

export async function completeWithAiVision(
  prompt: string,
  bytes: Uint8Array,
  mime: string,
  timeoutMs = 85_000,
  temperature = 0,
  json = false,
) {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const configuredBase = (
    process.env.AI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const gemini = isGeminiKey(key, configuredBase);
  const base = gemini
    ? "https://generativelanguage.googleapis.com/v1beta/openai"
    : configuredBase;
  const models = gemini
    ? geminiModels()
    : [process.env.AI_MODEL || "gpt-4o-mini"];
  const b64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;
  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          model,
          temperature,
          ...(json ? { response_format: { type: "json_object" } } : {}),
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = json.choices?.[0]?.message?.content?.trim() || "";
        if (text) return text;
        lastError = "empty-vision";
        continue;
      }
      lastError = await res.text();
      if (res.status === 401 || res.status === 403) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "vision";
    }
  }
  if (lastError) throw new Error(lastError.slice(0, 300));
  return null;
}
