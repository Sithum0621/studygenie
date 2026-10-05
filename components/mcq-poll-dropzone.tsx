"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { Banner, Button, Card, Input, Textarea } from "@/components/ui";
import { useCopy } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import type { McqPollQuestion, McqPollSummary } from "@/lib/types";
import {
  inspectPollUpload,
  POLL_UPLOAD_ACCEPT,
} from "@/lib/validate";

function failCopy(
  copy: ReturnType<typeof useCopy>,
  reason: "empty" | "tooBig" | "type" | "unsafe",
) {
  if (reason === "tooBig") return copy.fileTooBig;
  if (reason === "type") return copy.pollFileType;
  if (reason === "unsafe") return copy.fileUnsafe;
  return copy.noFile;
}

export function McqPollDropzone() {
  const copy = useCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<McqPollSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [polls, setPolls] = useState<McqPollSummary[]>([]);
  const [origin, setOrigin] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftFile, setDraftFile] = useState("");
  const [draft, setDraft] = useState<McqPollQuestion[] | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPolls(localStore.getMcqPolls());
      setOrigin(window.location.origin);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function handleFile(file: File | null) {
    setError(null);
    setCopied(false);
    setCreated(null);
    const check = await inspectPollUpload(file);
    if (!check.ok || !file) {
      setError(failCopy(copy, check.ok ? "empty" : check.reason));
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file, check.fileName);
      const res = await fetch("/api/polls/extract", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        title?: string;
        fileName?: string;
        questions?: McqPollQuestion[];
      } | null;
      if (!res.ok || !data?.questions?.length) {
        if (data?.error === "noQuestions") setError(copy.pollNoQuestions);
        else if (data?.error === "tooBig" || data?.error === "type") {
          setError(failCopy(copy, data.error));
        } else setError(copy.pollExtractFail);
        return;
      }
      setDraftTitle(data.title || check.fileName);
      setDraftFile(data.fileName || check.fileName);
      setDraft(data.questions);
    } catch {
      setError(copy.pollExtractFail);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!draft?.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: draftTitle,
          fileName: draftFile,
          questions: draft,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        poll?: McqPollSummary;
      } | null;
      if (!res.ok || !data?.poll) {
        setError(copy.pollExtractFail);
        return;
      }
      const next = [
        data.poll,
        ...localStore.getMcqPolls().filter((row) => row.id !== data.poll!.id),
      ];
      localStore.saveMcqPolls(next);
      setPolls(next);
      setCreated(data.poll);
      setDraft(null);
    } catch {
      setError(copy.pollExtractFail);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(code: string) {
    const url = `${origin}/p/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<McqPollQuestion>) {
    setDraft((prev) =>
      prev
        ? prev.map((row, rowIndex) =>
            rowIndex === index ? { ...row, ...patch } : row,
          )
        : prev,
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="text-sm font-medium text-stone-800">{copy.pollDropTitle}</p>
        <p className="text-xs text-stone-500">{copy.pollDropHint}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDrag(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDrag(false);
            void handleFile(event.dataTransfer.files[0] || null);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
            drag
              ? "border-teal-700 bg-teal-50"
              : "border-stone-300 bg-stone-50 hover:border-teal-600"
          }`}
        >
          {busy ? (
            <LoaderCircle size={22} className="animate-spin text-teal-800" />
          ) : (
            <FileUp size={22} className="text-teal-800" />
          )}
          <span className="text-sm font-medium text-stone-800">
            {busy ? copy.pollDropBusy : copy.pollDropCta}
          </span>
          <span className="text-xs text-stone-500">{copy.pollSelectFile}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={POLL_UPLOAD_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0] || null);
            event.target.value = "";
          }}
        />
        {error ? <Banner>{error}</Banner> : null}
        {created ? (
          <div className="space-y-2 rounded-xl bg-teal-50 px-3 py-3">
            <p className="text-sm font-medium text-teal-900">{copy.pollLinkReady}</p>
            <p className="break-all text-xs text-teal-800">
              {origin}/p/{created.code}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void copyLink(created.code)}>
                {copied ? copy.pollCopied : copy.pollCopyLink}
              </Button>
              <a href={`/p/${created.code}`} target="_blank" rel="noreferrer">
                <Button type="button" variant="outline">
                  {copy.pollOpen}
                </Button>
              </a>
            </div>
          </div>
        ) : null}
      </Card>

      {draft ? (
        <Card className="space-y-3">
          <p className="text-sm font-medium text-stone-800">{copy.pollPreview}</p>
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          {draft.map((question, index) => (
            <div key={question.id} className="space-y-2 rounded-xl border border-stone-200 p-3">
              <p className="text-xs text-stone-500">
                {index + 1}. {copy.pollQuestions}
              </p>
              <Textarea
                rows={3}
                value={question.prompt}
                onChange={(event) =>
                  updateQuestion(index, { prompt: event.target.value })
                }
              />
              {question.options.map((option, optionIndex) => (
                <Input
                  key={`${question.id}_${optionIndex}`}
                  value={option}
                  onChange={(event) => {
                    const options = [...question.options];
                    options[optionIndex] = event.target.value;
                    updateQuestion(index, { options });
                  }}
                />
              ))}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void publish()}>
              {copy.pollMakeLink}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(null)}
            >
              {copy.pollCancelPreview}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <p className="text-sm font-medium text-stone-800">{copy.pollRecent}</p>
        {polls.length ? (
          <ul className="space-y-2">
            {polls.map((poll) => (
              <li
                key={poll.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{poll.title}</p>
                  <p className="text-xs text-stone-500">
                    {poll.questionCount} {copy.pollQuestions} · {poll.voteCount}{" "}
                    {copy.pollVotes}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2 text-xs"
                  onClick={() => void copyLink(poll.code)}
                >
                  {copy.pollCopyLink}
                </Button>
                <a href={`/p/${poll.code}`} target="_blank" rel="noreferrer">
                  <Button type="button" variant="ghost" className="px-3 py-2 text-xs">
                    {copy.pollOpen}
                  </Button>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">{copy.pollEmpty}</p>
        )}
      </Card>
    </div>
  );
}
