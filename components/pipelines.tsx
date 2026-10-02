"use client";

import { useMemo } from "react";
import { ArrowLeftRight, ArrowRight, Pause, Play, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { ENTITIES, STAGES, SYSTEMS } from "@/lib/systems";
import { ago, num } from "@/lib/format";
import type { Pipeline, SyncRecord } from "@/lib/types";
import { Badge, Button, Card, Dot, SystemMark, cx, useNow } from "./ui";

const HOURS = 24;

function hourly(records: SyncRecord[], now: number) {
  const buckets = new Array<number>(HOURS).fill(0);
  for (const r of records) {
    const h = Math.floor((now - r.at) / 3_600_000);
    if (h >= 0 && h < HOURS) buckets[HOURS - 1 - h]++;
  }
  return buckets;
}

function PipelineState({ p }: { p: Pipeline }) {
  if (p.run) return <Badge tone="accent"><Dot tone="accent" pulse />Läuft</Badge>;
  if (p.paused) return <Badge tone="muted"><Pause className="size-3" aria-hidden />Pausiert</Badge>;
  if (p.lastRunResult === "failed") return <Badge tone="bad"><Dot tone="bad" />Gestört</Badge>;
  if (p.lastRunResult === "partial") return <Badge tone="warn"><Dot tone="warn" />Teilweise</Badge>;
  return <Badge tone="ok"><Dot tone="ok" />Aktiv</Badge>;
}

/** Quelle → Ziel als Leitung; während eines Laufs fließen Pakete darüber. */
function Flow({ p }: { p: Pipeline }) {
  const running = !!p.run;
  const Icon = p.twoWay ? ArrowLeftRight : ArrowRight;
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <SystemMark id={p.source} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{SYSTEMS[p.source].name}</p>
          <p className="truncate text-xs text-muted">{SYSTEMS[p.source].kind}</p>
        </div>
      </div>

      <div className="relative flex h-10 min-w-10 flex-1 items-center">
        <svg aria-hidden className="absolute inset-x-0 top-1/2 h-2 w-full -translate-y-1/2 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 2">
          <line
            x1="0" y1="1" x2="100" y2="1"
            vectorEffect="non-scaling-stroke"
            strokeWidth={running ? 2 : 1.5}
            strokeDasharray={running ? "6 4" : p.paused ? "2 4" : "0"}
            className={running ? "flow-run stroke-accent" : "stroke-line-strong"}
          />
        </svg>
        {running && (
          <>
            {[0, 0.45, 0.9].map((delay) => (
              <span
                key={delay}
                className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]"
                style={{ animation: `packet 1.35s linear ${delay}s infinite` }}
              />
            ))}
          </>
        )}
        <span className="relative mx-auto inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-line">
          <Icon className="size-3" aria-label={ENTITIES[p.entity].many} />
          <span className="hidden sm:inline">{ENTITIES[p.entity].many}</span>
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{SYSTEMS[p.target].name}</p>
          <p className="truncate text-xs text-muted">{SYSTEMS[p.target].kind}</p>
        </div>
        <SystemMark id={p.target} size="lg" />
      </div>
    </div>
  );
}

function Stages({ p }: { p: Pipeline }) {
  const run = p.run!;
  return (
    <div role="status" aria-live="polite">
      <div className="flex gap-1">
        {STAGES.map((s, i) => (
          <div key={s.label} className="h-1 flex-1 overflow-hidden rounded-full bg-sunken ring-1 ring-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-100 ease-linear"
              style={{ width: i < run.stage ? "100%" : i > run.stage ? "0%" : `${stageFraction(run.progress, i) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium text-accent-ink">
          {run.stage + 1}/{STAGES.length} · {STAGES[run.stage].label} …
        </span>
        <span className="tabular font-mono text-muted">{Math.round(run.progress * 100)} %</span>
      </div>
    </div>
  );
}

function stageFraction(progress: number, stage: number) {
  const total = STAGES.reduce((s, x) => s + x.ms, 0);
  const start = STAGES.slice(0, stage).reduce((s, x) => s + x.ms, 0) / total;
  return Math.min(1, Math.max(0, (progress - start) / (STAGES[stage].ms / total)));
}

function Spark({ data, paused }: { data: number[]; paused: boolean }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden>
      {data.map((v, i) => (
        <span
          key={i}
          className={cx("flex-1 rounded-[1.5px]", v === 0 ? "bg-line" : paused ? "bg-faint/50" : i === data.length - 1 ? "bg-accent" : "bg-accent/35")}
          style={{ height: v === 0 ? 2 : `${Math.max(12, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function PipelineCard({ p, records }: { p: Pipeline; records: SyncRecord[] }) {
  const now = useNow(10_000);
  const trigger = useStore((s) => s.trigger);
  const togglePause = useStore((s) => s.togglePause);

  const stats = useMemo(() => {
    const day = records.filter((r) => now - r.at < 24 * 3_600_000);
    return {
      synced: day.filter((r) => r.status === "synced").length,
      failed: records.filter((r) => r.status === "failed").length,
      conflicts: records.filter((r) => r.status === "conflict").length,
      spark: hourly(day, now),
    };
  }, [records, now]);

  return (
    <Card className={cx("flex min-w-0 flex-col p-4 transition-shadow", p.run && "ring-accent/40")} aria-label={`Pipeline ${p.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">{p.name}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {p.twoWay ? "Zweiweg" : "Einweg"} · {p.schedule}
          </p>
        </div>
        <PipelineState p={p} />
      </div>

      <div className="mt-4">
        <Flow p={p} />
      </div>

      <div className="mt-4 min-h-[60px] rounded-lg bg-sunken px-3 py-2.5 ring-1 ring-line">
        {p.run ? (
          <Stages p={p} />
        ) : (
          <div className="flex items-end gap-4">
            <dl className="grid shrink-0 grid-cols-3 gap-x-4 text-xs">
              <div>
                <dt className="text-muted">24 h</dt>
                <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink">{num(stats.synced)}</dd>
              </div>
              <div>
                <dt className="text-muted">Fehler</dt>
                <dd className={cx("tabular mt-0.5 text-[15px] font-semibold", stats.failed ? "text-bad" : "text-faint")}>{stats.failed}</dd>
              </div>
              <div>
                <dt className="text-muted">Konflikte</dt>
                <dd className={cx("tabular mt-0.5 text-[15px] font-semibold", stats.conflicts ? "text-warn" : "text-faint")}>{stats.conflicts}</dd>
              </div>
            </dl>
            <div className="min-w-0 flex-1" title="Datensätze je Stunde, letzte 24 Stunden">
              <Spark data={stats.spark} paused={p.paused} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted">
          Letzter Lauf <span className="text-ink">{p.run ? "läuft gerade" : ago(p.lastRunAt, now)}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => togglePause(p.id)}
            disabled={!!p.run}
            aria-label={p.paused ? `${p.name} fortsetzen` : `${p.name} pausieren`}
            title={p.paused ? "Fortsetzen" : "Pausieren"}
          >
            {p.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button size="sm" onClick={() => trigger(p.id)} loading={!!p.run} disabled={p.paused}>
            {!p.run && <RefreshCw className="size-3.5" aria-hidden />}
            {p.run ? "Synchronisiert …" : "Jetzt synchronisieren"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Pipelines() {
  const pipelines = useStore((s) => s.pipelines);
  const records = useStore((s) => s.records);
  const byPipeline = useMemo(() => {
    const m = new Map<string, SyncRecord[]>();
    for (const r of records) {
      const list = m.get(r.pipelineId);
      if (list) list.push(r);
      else m.set(r.pipelineId, [r]);
    }
    return m;
  }, [records]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pipelines.map((p) => (
        <PipelineCard key={p.id} p={p} records={byPipeline.get(p.id) ?? []} />
      ))}
    </div>
  );
}
