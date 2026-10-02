"use client";

import { forwardRef, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { STATUS, SYSTEMS } from "@/lib/systems";
import type { Status, SystemId } from "@/lib/types";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export type Tone = "ok" | "bad" | "pend" | "warn" | "accent" | "muted";

const TONE: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  bad: "bg-bad-soft text-bad",
  pend: "bg-pend-soft text-pend",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent-ink",
  muted: "bg-sunken text-muted ring-1 ring-inset ring-line",
};

const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  bad: "bg-bad",
  pend: "bg-pend",
  warn: "bg-warn",
  accent: "bg-accent",
  muted: "bg-faint",
};

export function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return <span aria-hidden className={cx("inline-block size-1.5 shrink-0 rounded-full", DOT[tone], pulse && "animate-[pulse-dot_1.4s_ease-in-out_infinite]")} />;
}

export function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-5 items-center gap-1.5 rounded-md px-1.5 text-[11.5px] font-medium whitespace-nowrap", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone}>
      {status === "pending" ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : <Dot tone={s.tone} />}
      {s.label}
    </Badge>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100",
        size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3.5 text-sm",
        variant === "primary" && "bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(13,19,33,0.2)] hover:bg-accent-ink dark:text-[#0b0d1c]",
        variant === "secondary" && "bg-surface text-ink shadow-card ring-1 ring-line-strong hover:bg-sunken",
        variant === "ghost" && "text-muted hover:bg-sunken hover:text-ink",
        variant === "danger" && "bg-surface text-bad ring-1 ring-line-strong hover:bg-bad-soft",
        className,
      )}
      {...rest}
    >
      {loading && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx("rounded-xl bg-surface shadow-card ring-1 ring-line", className)} {...rest}>
      {children}
    </section>
  );
}

export function SystemMark({ id, size = "md" }: { id: SystemId; size?: "sm" | "md" | "lg" }) {
  const s = SYSTEMS[id];
  return (
    <span
      aria-hidden
      title={s.name}
      style={{ background: s.color }}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-md font-mono font-semibold tracking-tight text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
        size === "sm" && "h-5 min-w-5 px-[3px] text-[8px]",
        size === "md" && "size-8 text-[10.5px]",
        size === "lg" && "size-10 text-xs",
      )}
    >
      {s.short}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-sunken px-1 font-mono text-[10.5px] text-muted">
      {children}
    </kbd>
  );
}

/** Uhr für relative Zeitangaben; tickt nur, solange die Komponente sichtbar ist. */
export function useNow(interval = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}
