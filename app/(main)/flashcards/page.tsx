"use client";

import { useState } from "react";
import { Banner, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy, useLanguage } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import { buildStudentSnapshot } from "@/lib/student-context";
import { matchSubject } from "@/lib/subject-progress";
import { setLastStudySubject } from "@/lib/study-time";
import type { Flashcard } from "@/lib/types";
import { sanitizeText } from "@/lib/validate";

export default function FlashcardsPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoAi, setDemoAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const topicText = sanitizeText(topic, 200);
    if (!topicText) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flashcards",
          language,
          topic: topicText,
          student: buildStudentSnapshot(user, topicText),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        cards?: Flashcard[];
        demo?: boolean;
      } | null;
      if (!res.ok || !data) {
        setError(copy.somethingWentWrong);
        return;
      }
      if (data.demo) setDemoAi(true);
      const next = data.cards || [];
      setCards(next);
      setIndex(0);
      setFlipped(false);
      setLastStudySubject(matchSubject(topicText, user?.subjects ?? []));
      localStore.saveDecks([
        {
          id: crypto.randomUUID(),
          topic: topicText,
          cards: next,
          createdAt: new Date().toISOString(),
        },
        ...localStore.getDecks(),
      ]);
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  function mark(known: boolean) {
    setCards((prev) => {
      const next = prev.map((card, i) =>
        i === index ? { ...card, known } : card,
      );
      return next;
    });
    if (index + 1 < cards.length) {
      setIndex(index + 1);
      setFlipped(false);
    }
  }

  const card = cards[index];

  return (
    <div className="space-y-5">
      <PageHeader title={copy.flashTitle} hint={copy.flashHint} />
      {demoAi ? <Banner>{copy.mockAiBanner}</Banner> : null}
      <Field label={copy.topic}>
        <Input maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </Field>
      <Button className="w-full" onClick={generate} disabled={busy}>
        {busy ? copy.generating : copy.generateCards}
      </Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {cards.length === 0 ? (
        <p className="text-sm text-stone-500">{copy.flashEmpty}</p>
      ) : card ? (
        <Card className="space-y-4">
          <p className="text-xs text-stone-500">
            {index + 1} / {cards.length}
          </p>
          <p className="min-h-24 text-lg font-medium">
            {flipped ? card.back : card.front}
          </p>
          <Button variant="outline" className="w-full" onClick={() => setFlipped(!flipped)}>
            {copy.flip}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => mark(false)}>
              {copy.reviewAgain}
            </Button>
            <Button onClick={() => mark(true)}>{copy.iKnow}</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
