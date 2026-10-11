"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCopy } from "@/lib/language-context";
import { useWorkspace } from "@/lib/workspace-context";

export default function StudyDemoPage() {
  const { enterDemo, loading } = useAuth();
  const { ready, setWorkspace } = useWorkspace();
  const copy = useCopy();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || loading || started.current) return;
    started.current = true;
    setWorkspace("studygenie");
    void enterDemo("studygenie").then(() => {
      window.location.replace("/home");
    });
  }, [enterDemo, loading, ready, setWorkspace]);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-lg items-center justify-center px-6">
      <p className="text-sm text-stone-500">{copy.demoOpeningStudent}</p>
    </main>
  );
}
