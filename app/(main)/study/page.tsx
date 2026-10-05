"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { History, Plus, Send, Sparkles, X } from "lucide-react";
import { Banner, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { refreshDailyQuizFromStudy } from "@/lib/daily-quiz-job";
import { useCopy, useLanguage } from "@/lib/language-context";
import { makePartQuiz } from "@/lib/part-quiz";
import { buildStudentSnapshot } from "@/lib/student-context";
import {
  loadStudyChat,
  loadStudyChatList,
  titleFromText,
  upsertStudyChat,
} from "@/lib/study-chats";
import { hasGuidedCatalog } from "@/lib/guided-learning/catalog";
import {
  applyLessonTurn,
  getGuidedLearningState,
  getLessonProgress,
  isStudentQuestion,
  upsertGuidedLearningState,
} from "@/lib/study-progress";
import { setLastStudySubject } from "@/lib/study-time";
import { lessonPayload, postTutorChat } from "@/lib/tutor-api";
import type {
  ChatMessage,
  LessonProgress,
  StudentLearningState,
  StudyChat,
} from "@/lib/types";

const MOBILE_MQ = "(max-width: 767px)";
const PAGE = 14;

type ChatMeta = {
  id: string;
  title: string;
  focus: StudyChat["focus"];
  unitId?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

function makeUserMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };
}

function makeAssistantMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function StudyPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoAi, setDemoAi] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mobile, setMobile] = useState(true);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [guided, setGuided] = useState<StudentLearningState | null>(null);
  const [quizTopic, setQuizTopic] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastAssistantAt = useRef(0);
  const stickBottom = useRef(true);

  const visible = activeMessages.slice(-visibleCount);
  const hasOlder = visibleCount < activeMessages.length;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setChats(loadStudyChatList());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MQ);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!stickBottom.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [visible.length, busy]);

  function persist(chat: StudyChat) {
    upsertStudyChat(chat);
    setChats(loadStudyChatList());
    setActiveId(chat.id);
    setActiveMessages(chat.messages);
    return chat;
  }

  function newChat() {
    setActiveId(null);
    setActiveMessages([]);
    setVisibleCount(PAGE);
    setDemoAi(false);
    setHistoryOpen(false);
    setUnitId(null);
    setProgress(null);
    setGuided(null);
    setQuizTopic(null);
  }

  function selectChat(id: string) {
    const chat = loadStudyChat(id);
    setActiveId(id);
    setActiveMessages(chat?.messages ?? []);
    setVisibleCount(PAGE);
    setHistoryOpen(false);
    setUnitId(chat?.unitId || null);
    setProgress(chat?.unitId ? getLessonProgress(chat.unitId) : null);
    setGuided(
      chat?.unitId
        ? getGuidedLearningState(user?.id || "local", chat.unitId)
        : null,
    );
    setQuizTopic(null);
    stickBottom.current = true;
  }

  function startOrAppend(userMsg: ChatMessage, nextUnitId?: string) {
    const now = userMsg.createdAt;
    if (!activeId) {
      const chat: StudyChat = {
        id: crypto.randomUUID(),
        title: titleFromText(userMsg.content),
        messages: [userMsg],
        focus: null,
        unitId: nextUnitId,
        createdAt: now,
        updatedAt: now,
      };
      return persist(chat);
    }
    const current = loadStudyChat(activeId);
    return persist({
      id: activeId,
      title: current?.title || titleFromText(userMsg.content),
      messages: [...(current?.messages || activeMessages), userMsg],
      focus: current?.focus || null,
      unitId: current?.unitId || nextUnitId,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    });
  }

  async function sendText(
    text: string,
    options?: {
      display?: string;
      kind?: "start" | "question" | "answer";
      lesson?: LessonProgress;
    },
  ) {
    const content = text.trim();
    if (!content || busy) return;
    const shown = (options?.display || content).trim();
    const kind =
      options?.kind ||
      (isStudentQuestion(content) ? "question" : "answer");
    const current = options?.lesson || progress;
    const chat = startOrAppend(
      makeUserMessage(shown),
      current?.unitId || unitId || undefined,
    );
    const apiMessages =
      shown === content
        ? chat.messages
        : [
            ...chat.messages.slice(0, -1),
            { ...chat.messages[chat.messages.length - 1], content },
          ];
    setInput("");
    setBusy(true);
    stickBottom.current = true;
    const answerMs =
      lastAssistantAt.current && kind === "answer"
        ? Date.now() - lastAssistantAt.current
        : 0;
    try {
      const snapshot = buildStudentSnapshot(user, content);
      setLastStudySubject(user?.subjects?.[0] || snapshot.subjects[0] || "Science");
      const data = await postTutorChat({
        mode: "study",
        language,
        student: snapshot,
        messages: apiMessages,
        lesson: current ? lessonPayload(current, kind) : undefined,
        guided:
          current && hasGuidedCatalog(current.unitId)
            ? guided ||
              getGuidedLearningState(user?.id || "local", current.unitId)
            : undefined,
      });
      if (data.demo) setDemoAi(true);
      else setDemoAi(false);
      if (data.guided) {
        const saved = upsertGuidedLearningState({
          ...data.guided,
          studentId: user?.id || data.guided.studentId || "local",
        });
        setGuided(saved);
      }
      const nextChat = persist({
        ...chat,
        title: chat.title || titleFromText(content),
        messages: [
          ...chat.messages,
          makeAssistantMessage(data.reply || copy.somethingWentWrong),
        ],
        focus: data.focus || chat.focus,
        updatedAt: new Date().toISOString(),
      });
      lastAssistantAt.current = Date.now();
      if (current && kind !== "start") {
        const before = current.parts.filter((part) => part.done).length;
        const next = applyLessonTurn(current, {
          chatId: nextChat.id,
          answerMs,
          userText: shown,
          kind,
          partDone: data.partDone ?? false,
          correct: data.correct ?? false,
        });
        setProgress(next);
        const after = next.parts.filter((part) => part.done).length;
        if (after > before) {
          const donePart = next.parts[after - 1];
          void makePartQuiz({
            unitId: next.unitId,
            unitTitle: next.title,
            partTitle: donePart?.title || next.title,
            language,
            student: snapshot,
          }).then((quiz) => {
            if (quiz) setQuizTopic(quiz.topic);
          });
        }
      } else if (current) {
        setProgress(
          applyLessonTurn(current, {
            chatId: nextChat.id,
            userText: shown,
            kind: "start",
          }),
        );
      }
      refreshDailyQuizFromStudy(user, language);
    } catch {
      persist({
        ...chat,
        messages: [
          ...chat.messages,
          makeAssistantMessage(copy.somethingWentWrong),
        ],
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  }

  function onMessagesScroll() {
    const el = listRef.current;
    if (!el || !hasOlder || el.scrollTop > 48) return;
    const prev = el.scrollHeight;
    stickBottom.current = false;
    setVisibleCount((count) => Math.min(count + PAGE, activeMessages.length));
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight - prev;
      }
    });
  }

  return (
    <div className="relative -mx-1 flex min-h-[calc(100dvh-16rem)] overflow-hidden">
      {historyOpen && mobile ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/30"
          aria-label={copy.closeChats}
          onClick={() => setHistoryOpen(false)}
        />
      ) : null}

      <aside
        className={`absolute inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-stone-200 bg-[#f6f3ec] p-2 shadow-lg transition-transform duration-200 md:static md:z-0 md:w-44 md:shadow-none ${
          historyOpen ? "translate-x-0" : "pointer-events-none -translate-x-full md:hidden"
        }`}
        aria-hidden={!historyOpen}
      >
        <div className="mb-2 flex items-center justify-between gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
            {copy.previousChats}
          </p>
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            aria-label={copy.closeChats}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-200"
          >
            <X size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={newChat}
          className="mb-2 flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-2 py-2 text-[11px] font-medium text-stone-700 hover:border-teal-700 hover:bg-teal-50"
        >
          <Plus size={12} />
          {copy.newStudyChat}
        </button>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {chats.length === 0 ? (
            <p className="px-1 text-[11px] text-stone-400">{copy.noStudyChats}</p>
          ) : (
            chats.map((chat) => {
              const selected = chat.id === activeId;
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => selectChat(chat.id)}
                  className={`w-full rounded-xl px-2 py-2 text-left ${
                    selected
                      ? "bg-teal-700 text-white"
                      : "bg-white text-stone-700 hover:bg-teal-50"
                  }`}
                >
                  <p className="truncate text-[11px] font-medium">{chat.title}</p>
                  {chat.focus ? (
                    <p
                      className={`truncate text-[10px] ${
                        selected ? "text-teal-100" : "text-stone-400"
                      }`}
                    >
                      {chat.focus.subject}
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-label={historyOpen ? copy.closeChats : copy.openChats}
            aria-expanded={historyOpen}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:border-teal-700 hover:bg-teal-50"
          >
            {historyOpen ? <X size={14} /> : <History size={14} />}
            {copy.previousChats}
          </button>
          {activeId || activeMessages.length ? (
            <button
              type="button"
              onClick={newChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:border-teal-700 hover:bg-teal-50"
            >
              <Plus size={14} />
              {copy.newStudyChat}
            </button>
          ) : null}
        </div>
        {quizTopic ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs">
            <p>{copy.partQuizReady}</p>
            <Link
              href={`/quiz?topic=${encodeURIComponent(quizTopic)}`}
              className="font-medium text-teal-800"
            >
              {copy.openPartQuiz}
            </Link>
          </div>
        ) : null}
        {demoAi ? <Banner>{copy.mockAiBanner}</Banner> : null}

        <>
            <div
              ref={listRef}
              onScroll={onMessagesScroll}
              className={`min-h-0 flex-1 space-y-3 pr-1 ${
                activeMessages.length ? "overflow-y-auto" : "overflow-hidden"
              }`}
            >
              {activeMessages.length === 0 && !busy ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 px-3 text-center">
                  <span className="study-orb flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-white">
                    <span className="study-ring" aria-hidden />
                    <Sparkles size={26} />
                  </span>
                  <h1 className="text-xl font-semibold">{copy.wantToLearn}</h1>
                  <p className="max-w-xs text-sm text-stone-500">
                    {copy.studyChatHint}
                  </p>
                </div>
              ) : (
                <>
                  {hasOlder ? (
                    <p className="text-center text-[11px] text-stone-400">
                      {copy.loadOlderChats}
                    </p>
                  ) : null}
                  {visible.map((msg) => (
                    <div
                      key={msg.id}
                      className={`whitespace-pre-wrap rounded-2xl px-3 py-3 text-sm ${
                        msg.role === "user"
                          ? "ml-6 bg-teal-800 text-white"
                          : "mr-4 bg-white"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}
                </>
              )}
              {busy ? (
                <p className="text-sm text-stone-500">{copy.thinking}</p>
              ) : null}
              <div ref={bottomRef} />
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendText(input);
              }}
            >
              <Input
                value={input}
                placeholder={copy.studyPlaceholder}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={copy.send}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
        </>
      </section>
    </div>
  );
}
