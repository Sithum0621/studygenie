"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import {
  guessSourceKind,
  indexSyllabusText,
  removeSyllabusSource,
} from "@/lib/syllabus-rag";
import type { UploadItem } from "@/lib/types";
import {
  canExtractText,
  deleteUploadBlob,
  getUploadBlob,
  putUploadBlob,
  readBlobText,
} from "@/lib/upload-files";
import {
  extractUploadText,
  inspectUpload,
  MAX_UPLOAD_BYTES,
  sanitizeText,
  UPLOAD_ACCEPT,
} from "@/lib/validate";

export default function UploadsPage() {
  const copy = useCopy();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [indexingId, setIndexingId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = localStore.getUploads();
      setItems(stored);
      void Promise.all(
        stored.map(async (item) => {
          if (item.extract || !canExtractText(item.fileName)) return item;
          const extract = await readBlobText(item.id, item.fileName);
          return extract ? { ...item, extract } : item;
        }),
      ).then((next) => {
        if (next.some((item, index) => item.extract !== stored[index]?.extract)) {
          localStore.saveUploads(next);
          setItems(next);
        }
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function failCopy(reason: "empty" | "tooBig" | "type" | "unsafe") {
    if (reason === "tooBig") return copy.fileTooBig;
    if (reason === "type") return copy.fileTypeBlocked;
    if (reason === "unsafe") return copy.fileUnsafe;
    return copy.noFile;
  }

  async function save() {
    setMessage(null);
    setError(null);
    const check = await inspectUpload(file);
    if (!check.ok || !file) {
      setError(failCopy(check.ok ? "empty" : check.reason));
      return;
    }
    try {
      const id = crypto.randomUUID();
      const extract = await extractUploadText(file, check.fileName);
      await putUploadBlob(id, file);
      const item: UploadItem = {
        id,
        title: sanitizeText(title, 120) || check.fileName,
        fileName: check.fileName,
        size: file.size,
        createdAt: new Date().toISOString(),
        mime: file.type,
        extract,
      };
      const next = [item, ...items];
      localStore.saveUploads(next);
      setItems(next);
      setTitle("");
      setFile(null);
      setMessage(copy.uploadSaved);
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  async function download(item: UploadItem) {
    try {
      const blob = await getUploadBlob(item.id);
      if (!blob) {
        setError(copy.fileExtractEmpty);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  async function remove(id: string) {
    try {
      await deleteUploadBlob(id);
      removeSyllabusSource(id);
      const next = items.filter((item) => item.id !== id);
      localStore.saveUploads(next);
      setItems(next);
      if (openId === id) setOpenId(null);
    } catch {
      setError(copy.somethingWentWrong);
    }
  }

  async function indexItem(item: UploadItem) {
    setMessage(null);
    setError(null);
    setIndexingId(item.id);
    try {
      let text = item.extract || "";
      if (!text && /\.pdf$/i.test(item.fileName)) {
        const blob = await getUploadBlob(item.id);
        if (!blob) {
          setError(copy.sourceIndexEmpty);
          return;
        }
        const form = new FormData();
        form.append("file", blob, item.fileName);
        form.append("title", item.title || item.fileName);
        form.append("subject", user?.subjects?.[0] || "");
        const res = await fetch("/api/syllabus/ingest", {
          method: "POST",
          body: form,
        });
        const data = (await res.json().catch(() => null)) as {
          text?: string;
        } | null;
        text = data?.text || "";
        if (text) {
          const withExtract = items.map((row) =>
            row.id === item.id ? { ...row, extract: text } : row,
          );
          localStore.saveUploads(withExtract);
          setItems(withExtract);
        }
      }
      if (!text.trim()) {
        setError(copy.sourceIndexEmpty);
        return;
      }
      const count = indexSyllabusText({
        sourceId: item.id,
        title: item.title || item.fileName,
        subject: user?.subjects?.[0] || "",
        kind: guessSourceKind(`${item.title} ${item.fileName}`),
        text,
      });
      if (!count) {
        setError(copy.sourceIndexEmpty);
        return;
      }
      const next = items.map((row) =>
        row.id === item.id ? { ...row, extract: text, indexed: true } : row,
      );
      localStore.saveUploads(next);
      setItems(next);
      setMessage(copy.sourceIndexed);
    } catch {
      setError(copy.somethingWentWrong);
    } finally {
      setIndexingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.uploadsTitle} hint={copy.uploadsHint} />
      <Field label={copy.fileTitle}>
        <Input
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label={copy.pickFile}>
        <Input
          type="file"
          accept={UPLOAD_ACCEPT}
          onChange={(e) => {
            setError(null);
            setMessage(null);
            setFile(e.target.files?.[0] || null);
          }}
        />
      </Field>
      <p className="text-xs text-stone-500">
        PDF / TXT / MD / DOC / DOCX · max {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB
      </p>
      <Button className="w-full" onClick={() => void save()}>
        {copy.saveUpload}
      </Button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-teal-800">{message}</p> : null}
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-stone-500">{copy.uploadsEmpty}</p>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="space-y-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-stone-500">
                  {item.fileName} · {Math.ceil(item.size / 1024)} KB
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.extract ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 py-2"
                      onClick={() =>
                        setOpenId((prev) => (prev === item.id ? null : item.id))
                      }
                    >
                      {copy.previewFile}
                    </Button>
                    <Link
                      href={`/notes?from=${item.id}`}
                      className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
                    >
                      {copy.useInNotes}
                    </Link>
                  </>
                ) : canExtractText(item.fileName) ? null : (
                  <p className="text-xs text-stone-500">{copy.fileExtractEmpty}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2"
                  onClick={() => void indexItem(item)}
                  disabled={indexingId === item.id}
                >
                  {item.indexed
                    ? copy.sourceIndexed
                    : indexingId === item.id
                      ? copy.indexingSource
                      : copy.indexForAi}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 py-2"
                  onClick={() => void download(item)}
                >
                  {copy.downloadFile}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-2"
                  onClick={() => void remove(item.id)}
                >
                  {copy.deleteFile}
                </Button>
              </div>
              {openId === item.id && item.extract ? (
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-stone-50 p-3 font-sans text-sm text-stone-700">
                  {item.extract}
                </pre>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
