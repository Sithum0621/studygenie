"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  FileText,
  Flame,
  Gamepad2,
  Home,
  Layers,
  ListChecks,
  ListTodo,
  MessageCircle,
  Paperclip,
  Map,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { LanguageSwitch } from "@/components/language-switch";
import { useCopy } from "@/lib/language-context";
import { useUi } from "@/lib/ui-context";
import { useWorkspace } from "@/lib/workspace-context";

export function AppSidebar() {
  const copy = useCopy();
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const { sidebarOpen, closeSidebar } = useUi();

  const studentLinks = [
    { href: "/home", label: copy.navHome, icon: Home },
    { href: "/tasks", label: copy.navTasks, icon: ListTodo },
    { href: "/study", label: copy.navStudy, icon: Sparkles },
    { href: "/game", label: copy.navGame, icon: Gamepad2 },
    { href: "/bio", label: copy.navBio, icon: UserRound },
    { href: "/daily-questions", label: copy.dailyQuiz, icon: Flame },
    { href: "/guide", label: copy.guideLearning, icon: Map },
    { href: "/papers", label: copy.papers, icon: FileText },
    { href: "/tutor", label: copy.tutor, icon: MessageCircle },
    { href: "/notes", label: copy.notes, icon: BookOpen },
    { href: "/quiz", label: copy.quiz, icon: ListChecks },
    { href: "/flashcards", label: copy.flashcards, icon: Layers },
    { href: "/uploads", label: copy.uploads, icon: Paperclip },
  ];

  const teacherLinks = [
    { href: "/class", label: copy.teacherHome, icon: Home },
    { href: "/class/classes", label: copy.classes, icon: BookOpen },
    { href: "/class/students", label: copy.students, icon: Users },
    { href: "/class/assignments", label: copy.assignments, icon: ClipboardList },
    { href: "/class/daily-questions", label: copy.dailyQuestions, icon: ListChecks },
    { href: "/bio", label: copy.navBio, icon: UserRound },
  ];

  const links = workspace === "classgenie" ? teacherLinks : studentLinks;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white text-stone-900 shadow-xl transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen ? true : undefined}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <p className="text-sm font-medium">
            {workspace === "classgenie" ? copy.classGenie : copy.appName}
          </p>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label={copy.closeMenu}
            className="rounded-full p-2 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href ||
              (link.href !== "/class" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeSidebar}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                  active ? "bg-teal-50 text-teal-900" : "hover:bg-stone-100"
                }`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 px-4 py-4">
          <p className="mb-2 text-xs text-stone-500">{copy.languageMix}</p>
          <LanguageSwitch />
        </div>
      </aside>
    </>
  );
}
