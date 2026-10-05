"use client";

import { useCopy } from "@/lib/language-context";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const copy = useCopy();

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-lg font-semibold text-stone-900">
        {copy.somethingWentWrong}
      </h1>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-medium text-white"
      >
        {copy.tryAgain}
      </button>
    </main>
  );
}
