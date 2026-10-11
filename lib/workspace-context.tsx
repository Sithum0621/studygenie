"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Workspace = "studygenie" | "classgenie";

type WorkspaceContextValue = {
  workspace: Workspace;
  ready: boolean;
  setWorkspace: (workspace: Workspace) => void;
};

const STORAGE_KEY = "studygenie.workspace";
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredWorkspace(): Workspace {
  if (typeof window === "undefined") return "studygenie";
  return localStorage.getItem(STORAGE_KEY) === "classgenie"
    ? "classgenie"
    : "studygenie";
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace>("studygenie");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setWorkspaceState(readStoredWorkspace());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      ready,
      setWorkspace(next) {
        setWorkspaceState(next);
        localStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [ready, workspace],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
