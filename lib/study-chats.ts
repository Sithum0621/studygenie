import { DAILY_SUBJECTS } from "./daily-questions";
import { localStore } from "./local-store";
import { lessonFocuses } from "./study-progress";
import type { ChatMessage, StudyChat, StudyFocus } from "./types";

export function loadStudyChats() {
  return localStore
    .getStudyChats()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadStudyChatList() {
  return loadStudyChats().map((chat) => ({
    id: chat.id,
    title: chat.title,
    focus: chat.focus,
    unitId: chat.unitId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messageCount: chat.messages.length,
  }));
}

export function loadStudyChat(id: string) {
  return loadStudyChats().find((chat) => chat.id === id) || null;
}

export function titleFromText(text: string) {
  const lesson = text.match(/^LESSON\s+(.+?)\.\s+(?:Grade|Topics:)/i);
  const clean = (lesson?.[1] || text).replace(/\s+/g, " ").trim();
  if (!clean) return "Chat";
  return clean.length > 36 ? `${clean.slice(0, 34)}…` : clean;
}

export function guessStudyFocus(
  text: string,
  subjects: string[] = [],
): StudyFocus {
  const hay = text.toLowerCase();
  const pool = [...new Set([...subjects, ...DAILY_SUBJECTS])];
  const subject =
    pool.find((item) => hay.includes(item.toLowerCase())) ||
    pool[0] ||
    "Science";
  const confused =
    hay.includes("නැ") ||
    hay.includes("amarui") ||
    hay.includes("hard") ||
    hay.includes("clear") ||
    hay.includes("confused");
  return {
    subject,
    topic: titleFromText(text),
    level: confused ? "confused" : "starting",
  };
}

export function collectStudyFocuses(limit = 6): StudyFocus[] {
  const seen = new Set<string>();
  const focuses: StudyFocus[] = [];
  for (const row of lessonFocuses(limit)) {
    const key = `${row.subject}::${row.topic}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    focuses.push(row);
  }
  for (const chat of loadStudyChats()) {
    if (!chat.focus?.subject || !chat.focus.topic) continue;
    const key = `${chat.focus.subject}::${chat.focus.topic}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    focuses.push(chat.focus);
    if (focuses.length >= limit) break;
  }
  return focuses.slice(0, limit);
}

export function upsertStudyChat(chat: StudyChat) {
  const rest = loadStudyChats().filter((item) => item.id !== chat.id);
  localStore.saveStudyChats([chat, ...rest]);
  return chat;
}

export function createStudyChat(first: ChatMessage, focus: StudyFocus | null) {
  const now = new Date().toISOString();
  const chat: StudyChat = {
    id: crypto.randomUUID(),
    title: titleFromText(first.content),
    messages: [first],
    focus,
    createdAt: now,
    updatedAt: now,
  };
  return upsertStudyChat(chat);
}
