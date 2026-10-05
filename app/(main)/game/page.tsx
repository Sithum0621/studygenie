"use client";

import { useState } from "react";
import { AnswerReveal, Button, Card, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { pickGameQuestions } from "@/lib/game";
import { useCopy, useLanguage } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import type { QuizQuestion } from "@/lib/types";

export default function GamePage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState<number | null>(null);

  const current = questions[index];
  const playing = questions.length > 0 && score == null && current;

  function start() {
    setQuestions(
      pickGameQuestions(8, language, user?.medium ?? "sinhala", user?.subjects ?? []),
    );
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrect(0);
    setScore(null);
  }

  function choose(optionIndex: number) {
    if (revealed) return;
    setSelected(optionIndex);
  }

  function submit() {
    if (selected == null || revealed || !current) return;
    setRevealed(true);
    if (selected === current.answerIndex) setCorrect((value) => value + 1);
  }

  function next() {
    if (!revealed) return;
    if (index + 1 < questions.length) {
      setIndex((value) => value + 1);
      setSelected(null);
      setRevealed(false);
      return;
    }
    const percent = Math.round((correct / questions.length) * 100);
    setScore(percent);
    localStore.saveGameSessions([
      {
        id: crypto.randomUUID(),
        score: percent,
        count: questions.length,
        createdAt: new Date().toISOString(),
      },
      ...localStore.getGameSessions(),
    ]);
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.gameTitle} hint={copy.gameHint} />
      {!playing && score == null ? (
        <Card className="space-y-4">
          <p className="text-sm text-stone-600">{copy.gameHint}</p>
          <Button className="w-full" onClick={start}>
            {copy.playGame}
          </Button>
        </Card>
      ) : null}

      {playing ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{current.subject}</span>
            <span>
              {index + 1} / {questions.length}
            </span>
          </div>
          <h2 className="text-base font-medium">{current.prompt}</h2>
          <div className="space-y-2">
            {current.options.map((option, i) => {
              const chosen = selected === i;
              const isCorrect = i === current.answerIndex;
              let tone = "border-stone-200 bg-white";
              if (!revealed && chosen) tone = "border-teal-800 bg-teal-50";
              if (revealed && isCorrect) tone = "border-emerald-700 bg-emerald-50";
              else if (revealed && chosen && !isCorrect) {
                tone = "border-rose-600 bg-rose-50";
              }
              return (
                <button
                  key={`${current.id}-${i}`}
                  type="button"
                  onClick={() => choose(i)}
                  disabled={revealed}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm disabled:opacity-100 ${tone}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {revealed ? (
            <AnswerReveal
              wrong={selected !== current.answerIndex}
              statusLabel={
                selected === current.answerIndex ? copy.correct : copy.wrong
              }
              correctAnswerLabel={copy.correctAnswer}
              correctOption={current.options[current.answerIndex]}
              explanationLabel={copy.explanation}
              explanation={current.explanation}
            />
          ) : null}
          {selected != null && !revealed ? (
            <Button className="w-full" onClick={submit}>
              {copy.submitAnswer}
            </Button>
          ) : null}
          {revealed ? (
            <Button className="w-full" onClick={next}>
              {index + 1 === questions.length ? copy.seeScore : copy.nextQuestion}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {score != null ? (
        <Card className="space-y-3">
          <p className="text-sm text-stone-500">{copy.yourScore}</p>
          <p className="text-4xl font-semibold">{score}%</p>
          <Button className="w-full" onClick={start}>
            {copy.playAgain}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
