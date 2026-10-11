"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ClipboardList, FileText, ListChecks, Users } from "lucide-react";
import { LatestPaperStats } from "@/components/latest-paper-stats";
import { McqPollDropzone } from "@/components/mcq-poll-dropzone";
import { Card, PageHeader } from "@/components/ui";
import { loadAssignments, loadClasses, loadStudents } from "@/lib/class-room";
import { localStore } from "@/lib/local-store";
import { useCopy } from "@/lib/language-context";

export default function ClassHomePage() {
  const copy = useCopy();
  const [counts, setCounts] = useState({
    classes: 0,
    students: 0,
    assignments: 0,
    papers: 0,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCounts({
        classes: loadClasses().length,
        students: loadStudents().length,
        assignments: loadAssignments().length,
        papers: localStore.getMcqPolls().length,
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const items = [
    {
      href: "/class/papers",
      label: copy.teacherPapers,
      icon: FileText,
      count: counts.papers,
    },
    {
      href: "/class/classes",
      label: copy.classes,
      icon: BookOpen,
      count: counts.classes,
    },
    {
      href: "/class/students",
      label: copy.students,
      icon: Users,
      count: counts.students,
    },
    {
      href: "/class/assignments",
      label: copy.assignments,
      icon: ClipboardList,
      count: counts.assignments,
    },
    {
      href: "/class/daily-questions",
      label: copy.dailyQuestions,
      icon: ListChecks,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={copy.teacherHome} hint={copy.teacherHomeHint} />
      <LatestPaperStats />
      <McqPollDropzone />
      <Link
        href="/class/papers/create"
        className="inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-medium text-white hover:bg-teal-800"
      >
        {copy.createOwnPapers}
      </Link>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="flex items-center gap-3">
                <Icon size={18} className="text-teal-800" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.count != null ? (
                  <span className="ml-auto text-xs text-stone-500">
                    {item.count}
                  </span>
                ) : null}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
