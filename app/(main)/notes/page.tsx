"use client";

import { useEffect, useState } from "react";
import {
  Banner,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy, useLanguage } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import { buildStudentSnapshot } from "@/lib/student-context";
import { matchSubject } from "@/lib/subject-progress";
import { setLastStudySubject } from "@/lib/study-time";
import type { NoteItem } from "@/lib/types";
import { readBlobText } from "@/lib/upload-files";
import { sanitizeMultiline, sanitizeText } from "@/lib/validate";

export default function NotesPage() {
  const copy = useCopy();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [draft, setDraft] = useState<Pick<NoteItem, "title" | "body"> | null>(
    null,
  );
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [demoAi, setDemoAi] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setNotes(localStore.getNotes());
      const from = new URLSearchParams(window.location.search).get("from");
      if (!from) return;
      const upload = localStore.getUploads().find((item) => item.id === from);
      if (!upload) return;
      setTopic(sanitizeText(upload.title || upload.fileName, 200));
      if (upload.extract) {
        setSourceText(sanitizeMultiline(upload.extract, 20_000));
        return;
      }
      void readBlobText(upload.id, upload.fileName).then((text) => {
        if (text) setSourceText(text);
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function generate() {
    const topicText = sanitizeText(topic, 200);
    if (!topicText) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "notes",
          language,
          topic: topicText,
          sourceText: sanitizeMultiline(sourceText, 20_000),
          student: buildStudentSnapshot(user, topicText),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        title?: string;
        body?: string;
        demo?: boolean;
      } | null;
      if (!res.ok || !data) {
        setError(copy.somethingWentWrong);
        return;
      }
      if (data.demo) setDemoAi(true);
      setDraft({
        title: sanitizeText(data.title || topicText, 160),
        body: sanitizeMultiline(data.body || "", 20_000),
      });
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!draft) return;
    const item: NoteItem = {
      id: crypto.randomUUID(),
      title: sanitizeText(draft.title, 160),
      body: sanitizeMultiline(draft.body, 20_000),
      topic: sanitizeText(topic, 200),
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...notes];
    localStore.saveNotes(next);
    setNotes(next);
    setSaved(true);
    setLastStudySubject(matchSubject(topic, user?.subjects ?? []));
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.notesTitle} hint={copy.notesHint} />
      {demoAi ? <Banner>{copy.mockAiBanner}</Banner> : null}
      <Field label={copy.topic}>
        <Input maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} />
      </Field>
      <Field label={copy.sourceText}>
        <Textarea
          rows={4}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
      </Field>
      <Button className="w-full" onClick={generate} disabled={busy}>
        {busy ? copy.generating : copy.generateNotes}
      </Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {draft ? (
        <Card className="space-y-3">
          <h2 className="font-medium">{draft.title}</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm text-stone-700">
            {draft.body}
          </pre>
          <Button variant="outline" onClick={save}>
            {copy.saveNote}
          </Button>
          {saved ? <p className="text-sm text-teal-800">{copy.notesSaved}</p> : null}
        </Card>
      ) : null}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-stone-500">{copy.notesEmpty}</p>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <h3 className="font-medium">{note.title}</h3>
              <p className="mt-2 line-clamp-4 text-sm text-stone-600">
                {note.body}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
