"use client";

import { useState } from "react";
import { CircleCheck, FlaskConical, GitMerge, Play, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { ENTITIES, STAGES, SYSTEMS } from "@/lib/systems";
import { ago } from "@/lib/format";
import type { Scenario } from "@/lib/types";
import { Badge, Button, Card, SystemMark, cx, useNow } from "./ui";

/** Warteschlange der offenen Konflikte, darunter die zuletzt gelösten. */
export function ConflictQueue() {
  const conflicts = useStore((s) => s.conflicts);
  const pipelines = useStore((s) => s.pipelines);
  const openResolver = useStore((s) => s.openResolver);
  const now = useNow(15_000);
  const open = conflicts.filter((c) => !c.resolution);
  const done = conflicts.filter((c) => c.resolution).sort((x, y) => y.resolution!.at - x.resolution!.at).slice(0, 4);

  return (
    <Card aria-labelledby="queue-title">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
        <div>
          <h2 id="queue-title" className="text-[15px] font-semibold tracking-tight text-ink">Konflikte</h2>
          <p className="text-xs text-muted">Beide Seiten geändert, ein Mensch entscheidet.</p>
        </div>
        {open.length > 0 && (
          <Button size="sm" variant="primary" onClick={() => openResolver(open[0].id)}>
            <GitMerge className="size-3.5" aria-hidden />
            Alle lösen
          </Button>
        )}
      </div>

      {open.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <CircleCheck className="size-6 text-ok" aria-hidden />
          <p className="mt-2 text-sm font-medium text-ink">Keine offenen Konflikte</p>
          <p className="mt-0.5 text-xs text-muted">Im Simulator lässt sich einer erzeugen.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {open.map((c) => {
            const p = pipelines.find((x) => x.id === c.pipelineId);
            return (
              <li key={c.id}>
                <button
                  onClick={() => openResolver(c.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
                >
                  {p && (
                    <span className="flex shrink-0 gap-0.5">
                      <SystemMark id={p.source} size="sm" />
                      <SystemMark id={p.target} size="sm" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {ENTITIES[c.entity].one} <span className="font-mono">{c.ref}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{c.fields.map((f) => f.label).join(", ")}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <Badge tone="warn">{c.fields.length} Felder</Badge>
                    <span className="mt-1 block text-[11px] text-faint">{ago(c.detectedAt, now)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11.5px] font-medium tracking-wide text-faint uppercase">Zuletzt gelöst</p>
          <ul className="mt-2 space-y-1.5">
            {done.map((c) => {
              const p = pipelines.find((x) => x.id === c.pipelineId);
              const r = c.resolution!;
              const how = r.strategy === "merge" ? "zusammengeführt" : p ? `${SYSTEMS[r.strategy === "a" ? p.source : p.target].name} behalten` : "";
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-muted">
                    <span className="font-mono text-ink">{c.ref}</span> · {how}
                  </span>
                  <span className="shrink-0 text-faint">{ago(r.at, now)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "normal", label: "Normal", hint: "Meist sauber, selten ein Fehler" },
  { id: "conflict", label: "Mit Konflikt", hint: "Ein Datensatz wird zum Konflikt" },
  { id: "failure", label: "Mit Fehler", hint: "Ein Datensatz scheitert am Ziel" },
];

/** Läufe von Hand anstoßen, um Feed, Konflikte und Fehlerbehandlung live zu sehen. */
export function Simulator() {
  const pipelines = useStore((s) => s.pipelines);
  const records = useStore((s) => s.records);
  const trigger = useStore((s) => s.trigger);
  const triggerAll = useStore((s) => s.triggerAll);
  const retryAll = useStore((s) => s.retryAll);
  const [pipelineId, setPipelineId] = useState("p_shop_sap");
  const [scenario, setScenario] = useState<Scenario>("conflict");

  const p = pipelines.find((x) => x.id === pipelineId) ?? pipelines[0];
  const failed = records.filter((r) => r.status === "failed").length;
  const allBusy = pipelines.every((x) => x.run || x.paused);

  return (
    <Card aria-labelledby="sim-title">
      <div className="border-b border-line px-4 py-3.5">
        <h2 id="sim-title" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
          <FlaskConical className="size-4 text-accent" aria-hidden />
          Lauf-Simulator
        </h2>
        <p className="text-xs text-muted">Stößt einen Abgleich von Hand an. Es wird kein echtes System angesprochen.</p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <fieldset>
          <legend className="text-xs font-medium text-muted">Pipeline</legend>
          <div className="mt-1.5 space-y-1">
            {pipelines.map((x) => (
              <label
                key={x.id}
                className={cx(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  x.id === p?.id ? "bg-accent-soft/50 ring-accent/50" : "ring-transparent hover:bg-sunken",
                )}
              >
                <input type="radio" name="sim-pipeline" value={x.id} checked={x.id === p?.id} onChange={() => setPipelineId(x.id)} className="sr-only" />
                <span className="flex shrink-0 gap-0.5">
                  <SystemMark id={x.source} size="sm" />
                  <SystemMark id={x.target} size="sm" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{x.name}</span>
                {x.run ? <Badge tone="accent">{Math.round(x.run.progress * 100)} %</Badge> : x.paused ? <Badge tone="muted">Pausiert</Badge> : null}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-muted">Szenario</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-sunken p-1 ring-1 ring-line">
            {SCENARIOS.map((s) => (
              <label
                key={s.id}
                title={s.hint}
                className={cx(
                  "flex cursor-pointer items-center justify-center rounded-md px-1 py-1.5 text-center text-[12.5px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  scenario === s.id ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink",
                )}
              >
                <input type="radio" name="sim-scenario" value={s.id} checked={scenario === s.id} onChange={() => setScenario(s.id)} className="sr-only" />
                {s.label}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-faint">{SCENARIOS.find((s) => s.id === scenario)?.hint}.</p>
        </fieldset>

        {p && (
          <div>
            <Button
              variant="primary"
              className={cx("relative h-10 w-full overflow-hidden", p.run && "disabled:cursor-progress disabled:opacity-100")}
              onClick={() => trigger(p.id, scenario)}
              disabled={p.paused || !!p.run}
              aria-busy={!!p.run || undefined}
            >
              {p.run && (
                <span aria-hidden className="absolute inset-y-0 left-0 bg-white/15 transition-[width] duration-100 ease-linear" style={{ width: `${p.run.progress * 100}%` }} />
              )}
              <span className="relative inline-flex items-center gap-2">
                {p.run ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
                    {STAGES[p.run.stage].label} …
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" aria-hidden />
                    {p.paused ? "Pipeline ist pausiert" : "Sync anstoßen"}
                  </>
                )}
              </span>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => triggerAll(scenario)} disabled={allBusy}>
            Alle anstoßen
          </Button>
          <Button size="sm" variant={failed ? "danger" : "secondary"} onClick={retryAll} disabled={!failed}>
            <RotateCcw className="size-3.5" aria-hidden />
            {failed ? `${failed} erneut senden` : "Keine Fehler"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
