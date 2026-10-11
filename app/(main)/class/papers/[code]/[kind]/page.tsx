"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PollQuestionDetail } from "@/components/poll-question-detail";
import { Card, PageHeader } from "@/components/ui";
import { useCopy } from "@/lib/language-context";
import type { McqPollSummary, PollQuestionStat } from "@/lib/types";

type Kind = "wrong" | "correct";

function asKind(value: string | undefined): Kind | null {
  if (value === "wrong" || value === "correct") return value;
  return null;
}

export default function PaperQuestionKindPage() {
  const copy = useCopy();
  const params = useParams<{ code: string; kind: string }>();
  const kind = asKind(params.kind);
  const code = params.code || "";
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<PollQuestionStat[]>([]);
  const [busy, setBusy] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!code || !kind) {
      setBusy(false);
      setMissing(true);
      return;
    }
    let dead = false;
    void fetch(`/api/polls/${code}?stats=1`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          poll?: McqPollSummary;
          hardest?: PollQuestionStat[];
          easiest?: PollQuestionStat[];
        } | null;
        if (dead) return;
        if (!res.ok || !data) {
          setMissing(true);
          return;
        }
        setTitle(data.poll?.title || "");
        setItems(kind === "wrong" ? data.hardest || [] : data.easiest || []);
      })
      .catch(() => {
        if (!dead) setMissing(true);
      })
      .finally(() => {
        if (!dead) setBusy(false);
      });
    return () => {
      dead = true;
    };
  }, [code, kind]);

  const heading =
    kind === "correct" ? copy.pollEasiestTitle : copy.pollHardestTitle;
  const empty =
    kind === "correct" ? copy.pollNoCorrectYet : copy.pollNoWrongYet;
  const tone = kind === "correct" ? "correct" : "wrong";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link
          href="/class"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800"
        >
          <ArrowLeft size={16} />
          {copy.teacherHome}
        </Link>
        <PageHeader title={heading} hint={title || copy.latestPaper} />
      </div>

      {busy ? (
        <p className="text-sm text-stone-500">{copy.latestPaperLoading}</p>
      ) : missing ? (
        <Card>
          <p className="text-sm text-stone-500">{copy.pollNotFound}</p>
        </Card>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map((question) => (
            <PollQuestionDetail
              key={question.id}
              question={question}
              tone={tone}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-stone-500">{empty}</p>
        </Card>
      )}
    </div>
  );
}
