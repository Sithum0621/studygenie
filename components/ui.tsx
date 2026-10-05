import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
}) {
  const styles = {
    primary: "bg-teal-700 text-white hover:bg-teal-800",
    ghost: "bg-transparent text-stone-700 hover:bg-stone-100",
    outline: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-700 ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Banner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {children}
    </p>
  );
}

export function PageHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {hint ? <p className="text-sm text-stone-600">{hint}</p> : null}
    </header>
  );
}

export function AnswerReveal({
  wrong,
  statusLabel,
  correctAnswerLabel,
  correctOption,
  explanationLabel,
  explanation,
}: {
  wrong: boolean;
  statusLabel: string;
  correctAnswerLabel: string;
  correctOption: string;
  explanationLabel: string;
  explanation?: string;
}) {
  const detail = (explanation || "").trim();
  return (
    <div className="space-y-1 text-sm">
      <p
        className={
          wrong ? "font-medium text-rose-700" : "font-medium text-emerald-800"
        }
      >
        {statusLabel}
      </p>
      <p className="text-stone-700">
        {correctAnswerLabel}: {correctOption}
      </p>
      <p className="text-stone-600">
        {explanationLabel}
        {detail ? `: ${detail}` : ""}
      </p>
    </div>
  );
}
