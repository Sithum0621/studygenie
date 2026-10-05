"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy } from "@/lib/language-context";

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const copy = useCopy();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [loading, router, user]);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-lg flex-col justify-between px-6 py-10">
      <div className="space-y-6">
        <p className="text-sm font-medium text-teal-800">{copy.appName}</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">
          {copy.tagline}
        </h1>
        <p className="text-base leading-7 text-stone-600">{copy.welcomeBody}</p>
        <p className="text-sm text-stone-500">{copy.installHint}</p>
      </div>
      <div className="space-y-3">
        <Link href="/signup" className="block">
          <Button className="w-full">{copy.startLearning}</Button>
        </Link>
        <p className="text-center text-sm text-stone-600">
          {copy.alreadyHaveAccount}{" "}
          <Link href="/login" className="font-medium text-teal-800">
            {copy.login}
          </Link>
        </p>
      </div>
    </main>
  );
}
