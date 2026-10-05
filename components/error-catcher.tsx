"use client";

import { useEffect } from "react";

export function ErrorCatcher() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      event.preventDefault();
    };
    const onReject = (event: PromiseRejectionEvent) => {
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  return null;
}
