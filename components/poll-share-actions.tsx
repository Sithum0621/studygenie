"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui";
import { useCopy } from "@/lib/language-context";
import {
  pollShareUrl,
  saveTeacherPoll,
  whatsappShareHref,
} from "@/lib/poll-share";
import type { McqPollSummary } from "@/lib/types";

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function PollShareActions({
  poll,
  origin,
  compact = false,
  onSaved,
}: {
  poll: McqPollSummary;
  origin: string;
  compact?: boolean;
  onSaved?: (items: McqPollSummary[]) => void;
}) {
  const copy = useCopy();
  const [copied, setCopied] = useState(false);
  const url = pollShareUrl(origin, poll);
  const className = compact ? "gap-1.5 px-3 py-2 text-xs" : "gap-2";

  function persist() {
    onSaved?.(saveTeacherPoll(poll));
  }

  async function copyLink() {
    persist();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function shareWhatsApp() {
    persist();
    window.open(whatsappShareHref(url, poll.title), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => void copyLink()}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? copy.pollCopied : copy.pollCopyLink}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={`${className} text-green-700`}
        onClick={shareWhatsApp}
      >
        <WhatsAppIcon />
        {copy.pollShareWhatsApp}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={className}
        onClick={() =>
          window.open(`/p/${poll.code}`, "_blank", "noopener,noreferrer")
        }
      >
        {copy.pollOpen}
      </Button>
    </>
  );
}

export function PollShareDialog({
  poll,
  origin,
  open,
  onClose,
  onSaved,
}: {
  poll: McqPollSummary;
  origin: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (items: McqPollSummary[]) => void;
}) {
  const copy = useCopy();
  const url = pollShareUrl(origin, poll);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={copy.cancel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="poll-share-title"
        className="relative z-10 w-full max-w-md space-y-3 rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p
              id="poll-share-title"
              className="text-sm font-medium text-stone-900"
            >
              {copy.pollSharePopupTitle}
            </p>
            <p className="text-xs text-stone-500">{copy.pollSharePopupHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.cancel}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>
        <p className="truncate text-sm font-medium text-teal-900">{poll.title}</p>
        <p className="break-all rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-700">
          {url}
        </p>
        <p className="text-xs text-teal-800">{copy.pollSaved}</p>
        <div className="flex flex-wrap gap-2">
          <PollShareActions poll={poll} origin={origin} onSaved={onSaved} />
        </div>
      </div>
    </div>
  );
}
