import { AppShell, AuthGate } from "@/components/app-shell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
