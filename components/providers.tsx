"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { UiProvider } from "@/lib/ui-context";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { ErrorCatcher } from "./error-catcher";
import { PwaRegister } from "./pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <UiProvider>
              <ErrorCatcher />
              <PwaRegister />
              {children}
            </UiProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
