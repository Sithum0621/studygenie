"use client";

import { createContext, useContext, useMemo, useState } from "react";

type UiContextValue = {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const value = useMemo<UiContextValue>(
    () => ({
      sidebarOpen,
      openSidebar: () => setSidebarOpen(true),
      closeSidebar: () => setSidebarOpen(false),
      toggleSidebar: () => setSidebarOpen((open) => !open),
    }),
    [sidebarOpen],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside UiProvider");
  return ctx;
}
