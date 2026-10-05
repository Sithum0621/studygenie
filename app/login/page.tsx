"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useCopy } from "@/lib/language-context";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const copy = useCopy();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-lg flex-col px-6 py-10">
      <PageHeader title={copy.loginTitle} hint={copy.loginHint} />
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            const message = await signIn(
              values.email.trim().toLowerCase(),
              values.password,
            );
            if (message) {
              setError(message);
              return;
            }
            router.push("/home");
          } catch {
            setError(copy.somethingWentWrong);
          }
        })}
      >
        <Field label={copy.email}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label={copy.password}>
          <Input
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {form.formState.errors.email ? (
          <p className="text-sm text-red-700">{copy.invalidEmail}</p>
        ) : null}
        <Button className="w-full" disabled={form.formState.isSubmitting}>
          {copy.login}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        {copy.noAccount}{" "}
        <Link href="/signup" className="font-medium text-teal-800">
          {copy.createAccount}
        </Link>
      </p>
    </main>
  );
}
