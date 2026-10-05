"use client";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f6f3ec] text-stone-900">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
          <h1 className="text-lg font-semibold">Something went wrong.</h1>
          <p className="text-sm text-stone-600">
            Page එක load වෙන්න බැරි උනා. ආයෙත් try කරන්න.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-medium text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
