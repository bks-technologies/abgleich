"use client";

import { useMemo, useState } from "react";
import { FileText, GitMerge, RotateCcw, Search, ShoppingCart, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { ENTITIES, STATUS, SYSTEMS } from "@/lib/systems";
import { clock, duration, num } from "@/lib/format";
import type { Entity, Pipeline, Status, SyncRecord } from "@/lib/types";
import { Button, Card, StatusBadge, SystemMark, cx, useNow } from "./ui";

const ENTITY_ICON = { customer: Users, order: ShoppingCart, invoice: FileText } as const;
const PAGE = 30;

type StatusFilter = Status | "all";

export function Feed() {
  const records = useStore((s) => s.records);
  const pipelines = useStore((s) => s.pipelines);
  const retry = useStore((s) => s.retry);
  const openResolver = useStore((s) => s.openResolver);
  const now = useNow(5_000);

  const [status, setStatus] = useState<StatusFilter>("all");
  const [entity, setEntity] = useState<Entity | "all">("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const pipelineById = useMemo(() => new Map(pipelines.map((p) => [p.id, p])), [pipelines]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, synced: 0, failed: 0, pending: 0, conflict: 0 };
    for (const r of records) {
      if (entity !== "all" && r.entity !== entity) continue;
      c.all++;
      c[r.status]++;
    }
    return c;
  }, [records, entity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Nach Zeitpunkt sortieren: abgearbeitete und erneut gesendete Datensätze bekommen einen neuen Zeitstempel.
    return records.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (entity === "all" || r.entity === entity) &&
        (!q || r.ref.toLowerCase().includes(q) || r.label.toLowerCase().includes(q) || (r.message ?? "").toLowerCase().includes(q)),
    ).sort((a, b) => b.at - a.at);
  }, [records, status, entity, query]);

  const visible = filtered.slice(0, limit);

  return (
    <Card className="overflow-hidden" aria-labelledby="feed-title">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="feed-title" className="text-[15px] font-semibold tracking-tight text-ink">Synchronisationsverlauf</h2>
          <p className="text-xs text-muted">Jeder übertragene Datensatz, neueste zuerst.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative flex-1 sm:w-56 sm:flex-none">
            <span className="sr-only">Datensätze durchsuchen</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" aria-hidden />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Nummer, Firma, Fehler …"
              className="h-8 w-full rounded-lg bg-sunken pr-2.5 pl-8 text-[13px] text-ink ring-1 ring-line placeholder:text-faint focus:ring-accent focus:outline-none"
            />
          </label>
          <label>
            <span className="sr-only">Datentyp</span>
            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value as Entity | "all");
                setLimit(PAGE);
              }}
              className="h-8 rounded-lg bg-sunken px-2 text-[13px] text-ink ring-1 ring-line focus:ring-accent focus:outline-none"
            >
              <option value="all">Alle Typen</option>
              {(Object.keys(ENTITIES) as Entity[]).map((e) => (
                <option key={e} value={e}>{ENTITIES[e].many}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div role="group" aria-label="Nach Status filtern" className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
        {(["all", "synced", "failed", "pending", "conflict"] as const).map((s) => (
          <button
            key={s}
            aria-pressed={status === s}
            onClick={() => {
              setStatus(s);
              setLimit(PAGE);
            }}
            className={cx(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
              status === s ? "bg-ink text-surface" : "text-muted hover:bg-sunken hover:text-ink",
            )}
          >
            {s === "all" ? "Alle" : STATUS[s].label}
            <span className={cx("tabular text-[11.5px]", status === s ? "opacity-70" : "text-faint")}>{num(counts[s])}</span>
          </button>
        ))}
      </div>

      {/* Kopfzeile nur ab Tablet; darunter wird jede Zeile zur Karte. */}
      <div className="hidden grid-cols-[72px_128px_minmax(0,1fr)_150px_minmax(0,0.9fr)_112px] gap-3 border-b border-line bg-sunken px-4 py-2 text-[11.5px] font-medium tracking-wide text-faint uppercase md:grid">
        <span>Zeit</span>
        <span>Status</span>
        <span>Datensatz</span>
        <span>Pipeline</span>
        <span>Ergebnis</span>
        <span className="sr-only">Aktion</span>
      </div>

      <ol>
        {visible.map((r) => (
          <Row
            key={r.id}
            r={r}
            fresh={now - r.at < 6000 || r.status === "pending"}
            pipeline={pipelineById.get(r.pipelineId)}
            onRetry={() => retry(r.id)}
            onResolve={() => r.conflictId && openResolver(r.conflictId)}
          />
        ))}
      </ol>

      {visible.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">Keine Datensätze für diese Auswahl.</p>}

      {filtered.length > limit && (
        <div className="border-t border-line p-3 text-center">
          <Button size="sm" variant="ghost" onClick={() => setLimit((l) => l + PAGE)}>
            {num(Math.min(PAGE, filtered.length - limit))} weitere von {num(filtered.length - limit)} laden
          </Button>
        </div>
      )}
    </Card>
  );
}

function Row({
  r,
  fresh,
  pipeline,
  onRetry,
  onResolve,
}: {
  r: SyncRecord;
  fresh: boolean;
  pipeline?: Pipeline;
  onRetry: () => void;
  onResolve: () => void;
}) {
  const Icon = ENTITY_ICON[r.entity];
  return (
    <li
      className={cx(
        "grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[72px_128px_minmax(0,1fr)_150px_minmax(0,0.9fr)_112px] md:py-2.5",
        fresh && "row-new",
      )}
    >
      <time dateTime={new Date(r.at).toISOString()} className="tabular order-2 font-mono text-xs text-muted md:order-none">
        {clock(r.at)}
      </time>
      <span className="order-1 md:order-none">
        <StatusBadge status={r.status} />
      </span>

      <div className="order-3 col-span-2 flex min-w-0 items-center gap-2.5 md:order-none md:col-span-1">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-sunken text-muted ring-1 ring-line">
          <Icon className="size-3.5" aria-label={ENTITIES[r.entity].one} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">
            <span className="font-mono">{r.ref}</span>
            <span className="text-faint"> · {ENTITIES[r.entity].one}</span>
          </p>
          <p className="truncate text-xs text-muted">{r.label}</p>
        </div>
      </div>

      {pipeline ? (
        <div className="order-4 flex items-center gap-1 md:order-none" title={pipeline.name}>
          <SystemMark id={pipeline.source} size="sm" />
          <span className="text-faint" aria-hidden>→</span>
          <SystemMark id={pipeline.target} size="sm" />
          <span className="sr-only">{`${SYSTEMS[pipeline.source].name} nach ${SYSTEMS[pipeline.target].name}`}</span>
          <span className="ml-1.5 truncate text-xs text-muted md:hidden">{pipeline.name}</span>
        </div>
      ) : (
        <span className="order-4 md:order-none" />
      )}

      <p
        className={cx(
          "order-5 col-span-2 min-w-0 text-xs md:order-none md:col-span-1 md:truncate",
          r.status === "failed" ? "text-bad" : r.status === "conflict" ? "text-warn" : "text-muted",
        )}
        title={r.message}
      >
        {r.status === "pending"
          ? "Wird übertragen …"
          : r.status === "conflict"
            ? "Beide Seiten geändert, Entscheidung nötig"
            : r.message ?? (r.durationMs ? `Übertragen in ${duration(r.durationMs)}` : "")}
        {r.status === "failed" && r.attempts > 1 && <span className="text-faint"> · {r.attempts} Versuche</span>}
      </p>

      <div className="order-6 col-span-2 flex justify-end empty:hidden md:order-none md:col-span-1 md:empty:flex">
        {r.status === "failed" && (
          <Button size="sm" variant="secondary" onClick={onRetry} aria-label={`${r.ref} erneut senden`}>
            <RotateCcw className="size-3.5" aria-hidden />
            Erneut senden
          </Button>
        )}
        {r.status === "conflict" && (
          <Button size="sm" variant="primary" onClick={onResolve} aria-label={`Konflikt ${r.ref} lösen`}>
            <GitMerge className="size-3.5" aria-hidden />
            Lösen
          </Button>
        )}
      </div>
    </li>
  );
}
