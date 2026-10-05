"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Button, Field, Input, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { STUDY_MEDIUMS } from "@/lib/content-language";
import { DAILY_SUBJECTS } from "@/lib/daily-questions";
import { useCopy, useLanguage } from "@/lib/language-context";
import type { StudyMedium } from "@/lib/types";

export default function BioPage() {
  const { user, updateProfile, signOut } = useAuth();
  const copy = useCopy();
  const { language } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [grade, setGrade] = useState(user?.grade ?? "");
  const [subjects, setSubjects] = useState<string[]>(user?.subjects ?? []);
  const [medium, setMedium] = useState<StudyMedium>(user?.medium ?? "sinhala");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setGrade(user?.grade ?? "");
    setSubjects(user?.subjects ?? []);
    setMedium(user?.medium ?? "sinhala");
  }, [user]);

  const extra = subjects.filter(
    (item) => !(DAILY_SUBJECTS as readonly string[]).includes(item),
  );
  const chips = [...DAILY_SUBJECTS, ...extra];
  const mediumLabel: Record<StudyMedium, string> = {
    sinhala: copy.mediumSinhala,
    english: copy.mediumEnglish,
    tamil: copy.mediumTamil,
  };

  function toggleSubject(item: string) {
    setSubjects((prev) =>
      prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item],
    );
    setSaved(false);
  }

  async function save() {
    try {
      await updateProfile({
        name: name.trim().slice(0, 80),
        grade: grade.trim().slice(0, 40),
        languageMix: language,
        subjects,
        medium,
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.bioTitle} hint={copy.bioHint} />
      <Field label={copy.name}>
        <Input
          maxLength={80}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
      </Field>
      <Field label={copy.grade}>
        <Input
          maxLength={40}
          value={grade}
          placeholder="O/L, A/L, Grade 10..."
          onChange={(e) => {
            setGrade(e.target.value);
            setSaved(false);
          }}
        />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">{copy.studyMedium}</p>
        <p className="text-xs text-stone-500">{copy.studyMediumHint}</p>
        <div className="flex flex-wrap gap-2">
          {STUDY_MEDIUMS.map((item) => {
            const on = medium === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMedium(item);
                  setSaved(false);
                }}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
              >
                {mediumLabel[item]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-700">{copy.subjects}</p>
        <p className="text-xs text-stone-500">{copy.tapSubjects}</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((item) => {
            const on = subjects.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleSubject(item)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-stone-300 bg-white text-stone-700"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
      <Field label={copy.languageMix}>
        <LanguageSwitch />
      </Field>
      <Button className="w-full" onClick={save}>
        {copy.saveProfile}
      </Button>
      {saved ? <p className="text-sm text-teal-800">{copy.profileSaved}</p> : null}
      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          await signOut();
          router.replace("/");
        }}
      >
        {copy.logout}
      </Button>
    </div>
  );
}
