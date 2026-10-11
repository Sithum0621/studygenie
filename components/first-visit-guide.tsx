"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { hasSeenGuide, markGuideSeen } from "@/lib/first-visit-guide";
import { useCopy } from "@/lib/language-context";
import { useWorkspace } from "@/lib/workspace-context";

export function FirstVisitGuide() {
  const copy = useCopy();
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = useMemo(() => {
    if (workspace === "classgenie") {
      return [
        { title: copy.teacherGuide1Title, body: copy.teacherGuide1Body },
        { title: copy.teacherGuide2Title, body: copy.teacherGuide2Body },
        { title: copy.teacherGuide3Title, body: copy.teacherGuide3Body },
        { title: copy.teacherGuide4Title, body: copy.teacherGuide4Body },
      ];
    }
    return [
      { title: copy.studentGuide1Title, body: copy.studentGuide1Body },
      { title: copy.studentGuide2Title, body: copy.studentGuide2Body },
      { title: copy.studentGuide3Title, body: copy.studentGuide3Body },
      { title: copy.studentGuide4Title, body: copy.studentGuide4Body },
    ];
  }, [copy, workspace]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setStep(0);
      setOpen(!hasSeenGuide(workspace));
    }, 350);
    return () => window.clearTimeout(id);
  }, [workspace]);

  if (!open) return null;

  const last = step >= steps.length - 1;
  const current = steps[step];

  function finish() {
    markGuideSeen(workspace);
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/45 p-4 sm:items-center">
      <Card className="w-full max-w-md shadow-xl">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
          {workspace === "classgenie" ? copy.classGenie : copy.appName}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {step + 1} / {steps.length}
        </p>
        <h2 className="mt-3 text-xl font-semibold text-stone-900">
          {current.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">{current.body}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={finish}>
            {copy.firstGuideSkip}
          </Button>
          {last ? (
            <Button className="flex-1" onClick={finish}>
              {copy.firstGuideDone}
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => setStep((n) => n + 1)}>
              {copy.firstGuideNext}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
