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
import { sanitizeText } from "@/lib/validate";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(72),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const { signUp } = useAuth();
  const copy = useCopy();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-lg flex-col px-6 py-10">
      <PageHeader title={copy.signupTitle} hint={copy.signupHint} />
      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            const message = await signUp(
              sanitizeText(values.name, 80),
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
        <Field label={copy.name}>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label={copy.email}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label={copy.password}>
          <Input
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {form.formState.errors.name ? (
          <p className="text-sm text-red-700">{copy.invalidName}</p>
        ) : null}
        {form.formState.errors.email ? (
          <p className="text-sm text-red-700">{copy.invalidEmail}</p>
        ) : null}
        {form.formState.errors.password ? (
          <p className="text-sm text-red-700">{copy.weakPassword}</p>
        ) : null}
        <Button className="w-full" disabled={form.formState.isSubmitting}>
          {copy.createAccount}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        {copy.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-medium text-teal-800">
          {copy.login}
        </Link>
      </p>
    </main>
  );
}
