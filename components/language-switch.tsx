"use client";

import { useLanguage } from "@/lib/language-context";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { language, setLanguage, copy } = useLanguage();

  return (
    <div
      className={`inline-flex rounded-full border border-stone-300 bg-white p-1 text-xs ${className}`}
      role="group"
      aria-label={copy.languageMix}
    >
      <button
        type="button"
        onClick={() => setLanguage("singlish")}
        className={`rounded-full px-3 py-1.5 font-medium ${
          language === "singlish"
            ? "bg-teal-700 text-white"
            : "text-stone-600"
        }`}
      >
        {copy.singlish}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("english")}
        className={`rounded-full px-3 py-1.5 font-medium ${
          language === "english" ? "bg-teal-700 text-white" : "text-stone-600"
        }`}
      >
        {copy.english}
      </button>
    </div>
  );
}
