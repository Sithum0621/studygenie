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
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          <div>
            <p className="text-sm font-medium text-stone-900">
              {copy.welcomeHowStudentTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {copy.welcomeHowStudent}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-900">
              {copy.welcomeHowTeacherTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {copy.welcomeHowTeacher}
            </p>
          </div>
        </div>
        <p className="text-sm text-stone-500">{copy.installHint}</p>
      </div>
      <div className="space-y-3">
        <Link href="/signup" className="block">
          <Button className="w-full">{copy.startLearning}</Button>
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/demo/study" className="block">
            <Button variant="outline" className="w-full">
              {copy.tryStudyDemo}
            </Button>
          </Link>
          <Link href="/demo/class" className="block">
            <Button variant="outline" className="w-full">
              {copy.tryClassDemo}
            </Button>
          </Link>
        </div>
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
