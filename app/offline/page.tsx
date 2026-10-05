"use client";

import Link from "next/link";
import { useCopy } from "@/lib/language-context";

export default function OfflinePage() {
  const copy = useCopy();

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-lg flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold">{copy.offlineTitle}</h1>
      <p className="mt-3 leading-7 text-stone-600">{copy.offlineBody}</p>
      <Link
        href="/home"
        className="mt-6 inline-flex rounded-xl bg-teal-700 px-4 py-3 text-sm font-medium text-white"
      >
        {copy.goHome}
      </Link>
    </main>
  );
}
