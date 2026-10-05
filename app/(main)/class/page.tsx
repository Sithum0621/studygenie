"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ClipboardList, ListChecks, Users } from "lucide-react";
import { McqPollDropzone } from "@/components/mcq-poll-dropzone";
import { Card, PageHeader } from "@/components/ui";
import { loadAssignments, loadClasses, loadStudents } from "@/lib/class-room";
import { useCopy } from "@/lib/language-context";

export default function ClassHomePage() {
  const copy = useCopy();
  const [counts, setCounts] = useState({
    classes: 0,
    students: 0,
    assignments: 0,
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCounts({
        classes: loadClasses().length,
        students: loadStudents().length,
        assignments: loadAssignments().length,
      });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const items = [
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
      <McqPollDropzone />
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
