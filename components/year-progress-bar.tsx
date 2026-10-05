"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { useLanguage } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import type { YearEvent } from "@/lib/types";
import {
  dateFromDayOfYear,
  dayFromClick,
  daysBetween,
  getYearProgress,
  leftForDay,
  monthMarkers,
  parseYmd,
  toYmd,
} from "@/lib/year";

const FALLBACK = {
  year: 2026,
  dayOfYear: 1,
  daysInYear: 365,
  progress: 0,
};

type Draft = {
  id: string | null;
  date: string;
  title: string;
};

function monthName(
  year: number,
  month: number,
  language: "singlish" | "english",
) {
  const locale = language === "english" ? "en" : "si-LK";
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(year, month, 1),
  );
}

function formatEventDate(
  value: string,
  language: "singlish" | "english",
) {
  const locale = language === "english" ? "en" : "si-LK";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(parseYmd(value));
}

function upcomingEvent(events: YearEvent[], from: Date) {
  const start = toYmd(from);
  return [...events]
    .filter((event) => event.date >= start)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

export function YearProgressBar() {
  const { language, copy } = useLanguage();
  const [data, setData] = useState(FALLBACK);
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<YearEvent[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [todayYmd, setTodayYmd] = useState("2026-01-01");

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = getYearProgress();
      setData(next);
      setTodayYmd(toYmd(new Date()));
      setEvents(localStore.getYearEvents());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!draft) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDraft(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  const { year, dayOfYear, daysInYear, progress } = data;
  const today = Math.min(100, Math.max(0, progress * 100));
  const months = monthMarkers(year, daysInYear).filter(
    ({ left }) => left > 1.5 && left < 98.5 && Math.abs(left - today) > 1.4,
  );
  const yearEvents = events.filter(
    (event) => parseYmd(event.date).getFullYear() === year,
  );
  const next = useMemo(
    () => upcomingEvent(events, parseYmd(todayYmd)),
    [events, todayYmd],
  );

  const yearDay = copy.yearDayLabel
    .replace("{year}", String(year))
    .replace("{day}", String(dayOfYear));
  const nextLabel = !ready
    ? copy.noUpcomingEvent
    : next
      ? daysBetween(parseYmd(todayYmd), parseYmd(next.date)) === 0
        ? copy.nextEventToday
            .replace("{title}", next.title)
            .replace("{date}", formatEventDate(next.date, language))
        : copy.nextEventIn
            .replace("{title}", next.title)
            .replace("{date}", formatEventDate(next.date, language))
            .replace(
              "{n}",
              String(daysBetween(parseYmd(todayYmd), parseYmd(next.date))),
            )
      : copy.noUpcomingEvent;

  function persist(nextEvents: YearEvent[]) {
    setEvents(nextEvents);
    localStore.saveYearEvents(nextEvents);
  }

  function openForDay(day: number, id: string | null = null, title = "") {
    setDraft({
      id,
      date: toYmd(dateFromDayOfYear(year, day)),
      title,
    });
  }

  function onBarClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    openForDay(dayFromClick(ratio, daysInYear));
  }

  function saveDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title || !draft.date) return;
    if (draft.id) {
      persist(
        events.map((item) =>
          item.id === draft.id
            ? { ...item, date: draft.date, title }
            : item,
        ),
      );
    } else {
      persist([
        ...events,
        { id: crypto.randomUUID(), date: draft.date, title },
      ]);
    }
    setDraft(null);
  }

  function deleteDraft() {
    if (!draft?.id) return;
    persist(events.filter((item) => item.id !== draft.id));
    setDraft(null);
  }

  return (
    <div className="relative bg-transparent px-4 pb-1 pt-1">
      <div
        className="relative h-5 w-full cursor-pointer overflow-visible"
        role="meter"
        aria-label={copy.yearBar}
        aria-valuemin={1}
        aria-valuemax={daysInYear}
        aria-valuenow={dayOfYear}
        onClick={onBarClick}
      >
        <div className="year-bar-track pointer-events-none absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-full bg-[var(--year-bar-track)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${today}%`,
              background: "var(--year-bar-fill)",
            }}
          />
        </div>
        {months.map(({ month, left }) => (
          <button
            key={`m-${month}`}
            type="button"
            className="group absolute top-1/2 z-10 flex h-2.5 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none"
            style={{ left: `${left}%` }}
            aria-label={ready ? monthName(year, month, language) : undefined}
            onClick={(event) => {
              event.stopPropagation();
              openForDay(getYearProgress(new Date(year, month, 1)).dayOfYear);
            }}
          >
            <span className="h-1.5 w-px rounded-full bg-[var(--year-bar-tick)] group-hover:bg-[var(--year-bar-tick-hover)]" />
            {ready ? (
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-0.5 text-[11px] font-medium text-white group-hover:block group-focus:block">
                {monthName(year, month, language)}
              </span>
            ) : null}
          </button>
        ))}
        {ready
          ? yearEvents.map((item) => {
              const point = getYearProgress(parseYmd(item.date));
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.title}
                  aria-label={item.title}
                  className="absolute top-1/2 z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[var(--year-bar-event)] shadow-sm"
                  style={{
                    left: `${leftForDay(point.dayOfYear, daysInYear)}%`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDraft({
                      id: item.id,
                      date: item.date,
                      title: item.title,
                    });
                  }}
                />
              );
            })
          : null}
      </div>
      <div className="flex items-start justify-between gap-3 pt-1 text-[11px] text-stone-600">
        <span className="shrink-0">{yearDay}</span>
        <span className="truncate text-right">{nextLabel}</span>
      </div>
      {draft ? (
        <div
          className="absolute left-3 right-3 top-full z-50 mt-1 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-2 text-sm font-medium text-stone-800">
            {draft.id ? copy.editEvent : copy.addEvent}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={copy.eventDate}>
              <Input
                type="date"
                className="py-2"
                value={draft.date}
                onChange={(event) =>
                  setDraft({ ...draft, date: event.target.value })
                }
              />
            </Field>
            <Field label={copy.eventTitle}>
              <Input
                value={draft.title}
                autoFocus
                className="py-2"
                placeholder={copy.eventTitle}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveDraft();
                  if (event.key === "Escape") setDraft(null);
                }}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={saveDraft} className="px-3 py-2">
              {copy.saveEvent}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(null)}
              className="px-3 py-2"
            >
              {copy.cancel}
            </Button>
            {draft.id ? (
              <Button
                type="button"
                variant="ghost"
                onClick={deleteDraft}
                className="px-3 py-2"
              >
                {copy.deleteEvent}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
