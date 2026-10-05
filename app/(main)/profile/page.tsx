"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/bio");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
      Loading...
    </div>
  );
}
