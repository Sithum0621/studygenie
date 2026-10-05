"use client";

import { useState } from "react";
import { Banner, Button, PageHeader, Textarea } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy, useLanguage } from "@/lib/language-context";
import { buildStudentSnapshot } from "@/lib/student-context";
import { postTutorChat } from "@/lib/tutor-api";
import type { ChatMessage } from "@/lib/types";

export default function TutorPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoAi, setDemoAi] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function sendText(text: string) {
    if (!text || busy) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const data = await postTutorChat({
        language,
        student: buildStudentSnapshot(user, text),
        messages: next,
      });
      if (data.demo) setDemoAi(true);
      setMessages([
        ...next,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply || copy.somethingWentWrong,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages([
        ...next,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: copy.somethingWentWrong,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title={copy.tutorTitle} hint={copy.tutorHint} />
        <Button
          variant="outline"
          className="shrink-0 py-2"
          onClick={() => {
            setMessages([]);
            setDemoAi(false);
          }}
        >
          {copy.newChat}
        </Button>
      </div>
      {demoAi ? <Banner>{copy.mockAiBanner}</Banner> : null}
      <div className="min-h-64 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-500">{copy.emptyTutor}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => sendText(copy.startFromResultsPrompt)}
              disabled={busy}
            >
              {copy.startFromResults}
            </Button>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`whitespace-pre-wrap rounded-2xl px-3 py-3 text-sm ${
                msg.role === "user"
                  ? "ml-8 bg-teal-800 text-white"
                  : "mr-8 bg-white"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        {busy ? <p className="text-sm text-stone-500">{copy.thinking}</p> : null}
      </div>
      <div className="space-y-2">
        <Textarea
          rows={3}
          value={input}
          placeholder={copy.tutorPlaceholder}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={() => sendText(input.trim())}
          disabled={busy}
        >
          {copy.send}
        </Button>
      </div>
    </div>
  );
}
