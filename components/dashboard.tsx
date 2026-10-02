"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Info, RefreshCw, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useStore, type Toast } from "@/lib/store";
import { duration, num, percent } from "@/lib/format";
import { Feed } from "./feed";
import { Pipelines } from "./pipelines";
import { Resolver } from "./resolver";
import { ConflictQueue, Simulator } from "./side-panels";
import { Badge, Button, Card, Dot, cx, useNow } from "./ui";

function Logo() {
  return (
    <span aria-hidden className="relative inline-flex size-8 items-center justify-center rounded-lg bg-ink">
      <svg viewBox="0 0 20 20" className="size-4.5" fill="none" strokeWidth="2" strokeLinecap="round">
        <path d="M3 6h10" className="stroke-surface" />
        <path d="M10 3l3 3-3 3" className="stroke-surface" />
        <path d="M17 14H7" className="stroke-accent" />
        <path d="M10 11l-3 3 3 3" className="stroke-accent" />
      </svg>
    </span>
  );
}

function Header() {
  const pipelines = useStore((s) => s.pipelines);
  const triggerAll = useStore((s) => s.triggerAll);
  const reset = useStore((s) => s.reset);
  const active = pipelines.filter((p) => !p.paused).length;
  const running = pipelines.filter((p) => p.run).length;
  const allBusy = pipelines.every((p) => p.run || p.paused);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Logo />
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-ink">Abgleich</span>
          <span className="hidden truncate text-[13px] text-muted sm:inline">Datensynchronisation</span>
        </div>
        <Badge tone="muted" className="hidden md:inline-flex">Demo · erfundene Daten</Badge>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[13px] text-muted lg:inline-flex">
            <Dot tone={running ? "accent" : "ok"} pulse={!!running} />
            {running ? `${running} ${running === 1 ? "Lauf aktiv" : "Läufe aktiv"}` : `${active} von ${pipelines.length} Pipelines aktiv`}
          </span>
          <Button size="sm" variant="ghost" onClick={reset} title="Ausgangsstand wiederherstellen">
            <RotateCcw className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Zurücksetzen</span>
          </Button>
          <Button size="sm" variant="primary" onClick={() => triggerAll()} disabled={allBusy}>
            <RefreshCw className={cx("size-3.5", running > 0 && "animate-spin")} aria-hidden />
            <span className="hidden sm:inline">Alle synchronisieren</span>
            <span className="sm:hidden">Alle</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Kpis() {
  const records = useStore((s) => s.records);
  const conflicts = useStore((s) => s.conflicts);
  const openResolver = useStore((s) => s.openResolver);
  const now = useNow(15_000);

  const k = useMemo(() => {
    const day = records.filter((r) => now - r.at < 24 * 3_600_000);
    const synced = day.filter((r) => r.status === "synced");
    const failed = records.filter((r) => r.status === "failed");
    const pending = records.filter((r) => r.status === "pending").length;
    const open = conflicts.filter((c) => !c.resolution);
    const finished = synced.length + failed.length;
    const avg = synced.length ? Math.round(synced.reduce((s, r) => s + (r.durationMs ?? 0), 0) / synced.length) : 0;
    return {
      synced: synced.length,
      failed: failed.length,
      stuck: failed.filter((r) => !r.retryable).length,
      pending,
      open,
      rate: finished ? synced.length / finished : 1,
      avg,
    };
  }, [records, conflicts, now]);

  const tiles = [
    { label: "Synchronisiert (24 h)", value: num(k.synced), note: `Erfolgsquote ${percent(k.rate)}`, tone: "ok" as const },
    { label: "Fehlgeschlagen", value: num(k.failed), note: k.failed ? `${k.stuck} davon nicht wiederholbar` : "Nichts zu tun", tone: k.failed ? ("bad" as const) : ("muted" as const) },
    { label: "Ausstehend", value: num(k.pending), note: k.pending ? "In der Warteschlange" : "Schlange leer", tone: k.pending ? ("pend" as const) : ("muted" as const) },
    { label: "Ø Dauer je Datensatz", value: k.avg ? duration(k.avg) : "–", note: "Über alle Pipelines", tone: "muted" as const },
  ];

  return (
    <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="bg-surface px-4 py-3.5 sm:px-5">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Dot tone={t.tone} />
            {t.label}
          </p>
          <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">{t.value}</p>
          <p className="mt-0.5 truncate text-xs text-faint">{t.note}</p>
        </div>
      ))}
      <button
        onClick={() => k.open[0] && openResolver(k.open[0].id)}
        disabled={!k.open.length}
        className={cx(
          "group col-span-2 bg-surface px-4 py-3.5 text-left transition-colors sm:px-5 lg:col-span-1",
          k.open.length > 0 && "shadow-[inset_3px_0_0_var(--warn)] hover:bg-sunken",
        )}
      >
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Dot tone={k.open.length ? "warn" : "muted"} />
          Offene Konflikte
        </p>
        <p className={cx("tabular mt-1 text-2xl font-semibold tracking-tight", k.open.length ? "text-warn" : "text-ink")}>{k.open.length}</p>
        <p className="mt-0.5 truncate text-xs text-faint group-enabled:text-warn">{k.open.length ? "Jetzt entscheiden →" : "Alles entschieden"}</p>
      </button>
    </Card>
  );
}

const TOAST_ICON = { ok: CircleCheck, bad: CircleAlert, warn: TriangleAlert, info: Info } as const;
const TOAST_TONE = { ok: "text-ok", bad: "text-bad", warn: "text-warn", info: "text-accent" } as const;

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto">
      {toasts.map((t: Toast) => {
        const Icon = TOAST_ICON[t.tone];
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl bg-surface px-3.5 py-3 shadow-pop ring-1 ring-line-strong animate-[rise_0.2s_ease-out]">
            <Icon className={cx("mt-0.5 size-4 shrink-0", TOAST_TONE[t.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="-m-1 rounded p-1 text-faint hover:text-ink" aria-label="Meldung schließen">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-6" aria-busy>
      <div className="h-24 animate-pulse rounded-xl bg-surface ring-1 ring-line" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-surface ring-1 ring-line" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const ready = useStore((s) => s.ready);
  const init = useStore((s) => s.init);
  useEffect(() => init(), [init]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      {!ready ? (
        <Skeleton />
      ) : (
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">Übersicht</h1>
              <p className="mt-0.5 text-sm text-muted">Vier Pipelines zwischen sechs Systemen, Verlauf der letzten 24 Stunden.</p>
            </div>
          </div>

          <Kpis />

          {/* Ab xl zwei Spalten; darunter stehen Konflikte und Simulator vor dem langen Verlauf. */}
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-labelledby="pipes-title" className="min-w-0 xl:col-start-1">
              <h2 id="pipes-title" className="mb-3 text-[15px] font-semibold tracking-tight text-ink">Pipelines</h2>
              <Pipelines />
            </section>
            <aside className="min-w-0 space-y-6 xl:sticky xl:top-20 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start">
              <ConflictQueue />
              <Simulator />
            </aside>
            <div className="min-w-0 xl:col-start-1">
              <Feed />
            </div>
          </div>
        </main>
      )}

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Vorführstück von BKS Technologies. Alle Firmen, Personen und Zahlen sind erfunden.</p>
          <p>
            <Link href="/impressum" className="hover:text-ink">Impressum</Link>
            <span aria-hidden> · </span>
            <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
          </p>
        </div>
      </footer>

      <Resolver />
      <Toasts />
    </div>
  );
}
