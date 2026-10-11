"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PollShareActions } from "@/components/poll-share-actions";
import { Button, Card, PageHeader } from "@/components/ui";
import { useCopy } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import {
  deleteTeacherPoll,
  latestTeacherPolls,
  onTeacherPollsChange,
} from "@/lib/poll-share";
import type { McqPollSummary } from "@/lib/types";

export default function TeacherPapersPage() {
  const copy = useCopy();
  const [polls, setPolls] = useState<McqPollSummary[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const load = () => {
      setPolls(latestTeacherPolls(localStore.getMcqPolls()));
      setOrigin(window.location.origin);
    };
    const id = window.setTimeout(load, 0);
    const unsub = onTeacherPollsChange(load);
    return () => {
      window.clearTimeout(id);
      unsub();
    };
  }, []);

  const listed = latestTeacherPolls(polls);

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
        <PageHeader title={copy.teacherPapers} hint={copy.teacherPapersHint} />
      </div>

      {listed.length ? (
        <div className="space-y-3">
          {listed.map((poll, index) => (
            <Card key={poll.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <PollShareActions
                  poll={poll}
                  origin={origin}
                  compact
                  onSaved={setPolls}
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {index === 0 ? (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                        {copy.latestPaper}
                      </span>
                    ) : null}
                    <p className="truncate text-sm font-medium">{poll.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {poll.questionCount} {copy.pollQuestions} · {poll.voteCount}{" "}
                    {copy.pollVotes}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0 gap-1.5 px-3 py-2 text-xs text-rose-700 hover:bg-rose-50"
                  onClick={() => setPolls(deleteTeacherPoll(poll.id))}
                >
                  <Trash2 size={14} />
                  {copy.deletePaper}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-stone-500">{copy.pollEmpty}</p>
        </Card>
      )}
    </div>
  );
}
