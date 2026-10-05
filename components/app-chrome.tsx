"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { YearProgressBar } from "@/components/year-progress-bar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/p/")) {
    return <div className="min-h-dvh bg-[#f6f3ec]">{children}</div>;
  }

  return (
    <div className="min-h-dvh">
      <div className="fixed inset-x-0 top-0 z-40 overflow-visible">
        <SiteHeader />
        <YearProgressBar />
      </div>
      <AppSidebar />
      <div className="pt-28">{children}</div>
    </div>
  );
}
