"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SubjectBarChart } from "@/components/subject-bar-chart";
import { SyllabusDonut } from "@/components/syllabus-donut";
import { chartSubjects, loadGuideUnits, syllabusProgress } from "@/lib/guide-learning";
import { useCopy } from "@/lib/language-context";
import { localStore } from "@/lib/local-store";
import { subjectBarRows, type SubjectBarRow } from "@/lib/subject-progress";

export function HomeInsightSlider({
  subjects,
  grade,
}: {
  subjects: string[];
  grade?: string;
}) {
  const copy = useCopy();
  const scroller = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [rows, setRows] = useState<SubjectBarRow[]>(() =>
    chartSubjects(subjects).map((subject) => ({
      subject,
      score: 0,
      time: 0,
    })),
  );
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [percent, setPercent] = useState(0);
  const [waste, setWaste] = useState(0);

  const subjectKey = subjects.join("|");

  useEffect(() => {
    const refresh = () => {
      const nextUnits = loadGuideUnits(subjects, grade);
      const next = syllabusProgress(nextUnits);
      setRows(subjectBarRows(subjects));
      setDone(next.done);
      setTotal(next.total);
      setPercent(next.percent);
      setWaste(localStore.getStudyTime().wasteMinutes);
    };
    const start = window.setTimeout(refresh, 0);
    const id = window.setInterval(refresh, 10_000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [subjectKey, subjects, grade]);

  function go(next: number) {
    const index = Math.min(1, Math.max(0, next));
    const el = scroller.current;
    if (el) {
      el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    }
    setSlide(index);
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    setSlide(Math.round(el.scrollLeft / width));
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <section className="box-border shrink-0 grow-0 basis-full snap-start p-4">
            <SubjectBarChart rows={rows} />
          </section>
          <section className="box-border shrink-0 grow-0 basis-full snap-start p-4">
            <SyllabusDonut
              percent={percent}
              done={done}
              total={total}
              wastedMinutes={waste}
            />
          </section>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(slide - 1)}
          disabled={slide === 0}
          className="rounded-full p-1.5 text-stone-500 disabled:opacity-30"
          aria-label={copy.swipeCharts}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          {[0, 1].map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => go(index)}
              className={`h-1.5 rounded-full ${
                slide === index ? "w-5 bg-teal-700" : "w-1.5 bg-stone-300"
              }`}
              aria-label={`${copy.swipeCharts} ${index + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(slide + 1)}
          disabled={slide === 1}
          className="rounded-full p-1.5 text-stone-500 disabled:opacity-30"
          aria-label={copy.swipeCharts}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="mt-1 text-center text-[11px] text-stone-400">
        {copy.swipeCharts}
      </p>
    </div>
  );
}
