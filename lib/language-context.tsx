"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCopy, type AppLanguage, type Copy } from "./copy";

const STORAGE_KEY = "studygenie.language";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  copy: Copy;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") return "singlish";
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "english" ? "english" : "singlish";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("singlish");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setLanguageState(readStoredLanguage());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "english" ? "en" : "si";
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage(next) {
        setLanguageState(next);
        localStorage.setItem(STORAGE_KEY, next);
      },
      copy: getCopy(language),
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export function useCopy() {
  return useLanguage().copy;
}
