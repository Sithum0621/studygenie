"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCopy } from "@/lib/language-context";
import { useUi } from "@/lib/ui-context";
import { useWorkspace, type Workspace } from "@/lib/workspace-context";

function initials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "SG";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function SiteHeader() {
  const copy = useCopy();
  const { user } = useAuth();
  const { workspace, setWorkspace } = useWorkspace();
  const { openSidebar } = useUi();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const publicPaths = ["/", "/login", "/signup", "/offline"];
    if (!user || publicPaths.includes(pathname) || pathname.startsWith("/p/")) return;
    if (workspace === "classgenie" && !pathname.startsWith("/class") && pathname !== "/profile" && pathname !== "/bio") {
      router.replace("/class");
    }
    if (workspace === "studygenie" && pathname.startsWith("/class")) {
      router.replace("/home");
    }
  }, [pathname, router, user, workspace]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(next: Workspace) {
    setWorkspace(next);
    setOpen(false);
    if (!user) return;
    router.push(next === "classgenie" ? "/class" : "/home");
  }

  const label = workspace === "classgenie" ? copy.classGenie : copy.appName;

  return (
    <header className="h-14 bg-black text-white">
      <div className="flex h-full items-center justify-between px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={openSidebar}
            aria-label={copy.openMenu}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[15px] font-medium hover:bg-white/10"
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              <span className="truncate">{label}</span>
              <ChevronDown size={16} />
            </button>
            {open ? (
              <div
                role="listbox"
                className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-stone-900 shadow-lg"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={workspace === "studygenie"}
                  onClick={() => choose("studygenie")}
                  className={`flex w-full px-3 py-2 text-left text-sm ${
                    workspace === "studygenie" ? "bg-stone-100 font-medium" : ""
                  }`}
                >
                  {copy.studentApp}
                </button>
                <button
                  type="button"
                  role="option"
                  aria-selected={workspace === "classgenie"}
                  onClick={() => choose("classgenie")}
                  className={`flex w-full px-3 py-2 text-left text-sm ${
                    workspace === "classgenie" ? "bg-stone-100 font-medium" : ""
                  }`}
                >
                  {copy.teacherApp}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <Link
          href={user ? "/bio" : "/login"}
          aria-label={copy.navBio}
          className="rounded-full p-0.5 ring-2 ring-sky-300"
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-stone-500 to-stone-800 text-xs font-semibold text-white">
            {initials(user?.name, user?.email)}
          </span>
        </Link>
      </div>
    </header>
  );
}
