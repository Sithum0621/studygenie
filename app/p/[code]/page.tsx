"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Banner, Button, Card, PageHeader } from "@/components/ui";
import { useCopy } from "@/lib/language-context";

type Question = { id: string; prompt: string; options: string[] };
type Tally = { id: string; counts: number[]; total: number };

export default function PublicPollPage() {
  const copy = useCopy();
  const params = useParams<{ code: string }>();
  const code = params.code || "";
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [tallies, setTallies] = useState<Tally[] | null>(null);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!code) return;
    let dead = false;
    void fetch(`/api/polls/${code}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          poll?: { title?: string };
          questions?: Question[];
          voted?: boolean;
          tallies?: Tally[];
        } | null;
        if (dead) return;
        if (!res.ok || !data?.questions?.length) {
          setError(copy.pollNotFound);
          return;
        }
        setTitle(data.poll?.title || "Poll");
        setQuestions(data.questions);
        setPicks(data.questions.map(() => -1));
        setVoted(Boolean(data.voted));
        setTallies(data.tallies || null);
      })
      .catch(() => {
        if (!dead) setError(copy.pollNotFound);
      })
      .finally(() => {
        if (!dead) setBusy(false);
      });
    return () => {
      dead = true;
    };
  }, [code, copy.pollNotFound]);

  async function submit() {
    if (picks.some((pick) => pick < 0)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/polls/${code}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers: picks }),
      });
      const data = (await res.json().catch(() => null)) as {
        tallies?: Tally[];
      } | null;
      if (!res.ok) {
        setError(copy.pollExtractFail);
        return;
      }
      setVoted(true);
      setTallies(data?.tallies || null);
    } catch {
      setError(copy.pollExtractFail);
    } finally {
      setBusy(false);
    }
  }

  if (busy && !questions.length && !error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <PageHeader title="Poll" hint={copy.pollPublicHint} />
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <PageHeader title="Poll" hint={copy.pollNotFound} />
        <Banner>{error}</Banner>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
      <PageHeader title={title || "Poll"} hint={copy.pollPublicHint} />
      {error ? <Banner>{error}</Banner> : null}
      {voted ? <Banner>{copy.pollThanks}</Banner> : null}
      {questions.map((question, qIndex) => {
        const tally = tallies?.find((row) => row.id === question.id);
        return (
          <Card key={question.id} className="space-y-3">
            <p className="text-sm font-medium text-stone-800">
              {qIndex + 1}. {question.prompt}
            </p>
            <div className="space-y-2">
              {question.options.map((option, oIndex) => {
                const count = tally?.counts[oIndex] || 0;
                const total = tally?.total || 0;
                const pct = total ? Math.round((count / total) * 100) : 0;
                const selected = picks[qIndex] === oIndex;
                return (
                  <button
                    key={`${question.id}_${oIndex}`}
                    type="button"
                    disabled={voted || busy}
                    onClick={() =>
                      setPicks((prev) =>
                        prev.map((pick, index) =>
                          index === qIndex ? oIndex : pick,
                        ),
                      )
                    }
                    className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${
                      selected
                        ? "border-teal-700 bg-teal-50"
                        : "border-stone-200 bg-white"
                    }`}
                  >
                    <span>{option}</span>
                    {tally ? (
                      <span className="mt-1 block text-xs text-stone-500">
                        {count} · {pct}%
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
      {!voted && questions.length ? (
        <Button
          type="button"
          className="w-full"
          disabled={busy || picks.some((pick) => pick < 0)}
          onClick={() => void submit()}
        >
          {copy.pollSubmit}
        </Button>
      ) : null}
    </div>
  );
}
