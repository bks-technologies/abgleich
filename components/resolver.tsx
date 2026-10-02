"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, GitMerge, Info, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { countSides, newestPicks } from "@/lib/resolve";
import { ENTITIES, SYSTEMS } from "@/lib/systems";
import { ago, clock } from "@/lib/format";
import type { Conflict, ConflictField, Pipeline, Side, Strategy } from "@/lib/types";
import { Badge, Button, Kbd, SystemMark, cx, useNow } from "./ui";

/** Markiert die Wörter, die es auf der anderen Seite nicht gibt. Grob, aber genau genug für Namen, Adressen, Beträge. */
function Diff({ value, other }: { value: string; other: string }) {
  const theirs = new Set(other.split(/(\s+|,)/));
  const runs: { text: string; changed: boolean }[] = [];
  for (const part of value.split(/(\s+|,)/)) {
    if (!part) continue;
    const blank = !part.trim();
    const last = runs[runs.length - 1];
    const changed = blank ? !!last?.changed : !theirs.has(part);
    if (last && last.changed === changed) last.text += part;
    else runs.push({ text: part, changed });
  }
  return (
    <>
      {runs.map((r, i) =>
        r.changed ? (
          <span key={i}>
            <mark className="rounded-[3px] bg-warn-soft px-0.5 text-ink">{r.text.trimEnd()}</mark>
            {r.text.slice(r.text.trimEnd().length)}
          </span>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

export function Resolver() {
  const openId = useStore((s) => s.openConflictId);
  const conflicts = useStore((s) => s.conflicts);
  const pipelines = useStore((s) => s.pipelines);
  const openResolver = useStore((s) => s.openResolver);
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const conflict = conflicts.find((c) => c.id === openId && !c.resolution);
  const queue = useMemo(() => conflicts.filter((c) => !c.resolution), [conflicts]);
  const pipeline = conflict && pipelines.find((p) => p.id === conflict.pipelineId);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (conflict && !d.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!conflict && d.open) {
      d.close();
    }
  }, [conflict]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="resolver-title"
      onClose={() => {
        openResolver(null);
        returnFocus.current?.focus?.();
      }}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[min(92dvh,860px)] w-[min(100vw-24px,1040px)] max-w-none overflow-hidden rounded-2xl bg-surface p-0 text-ink shadow-pop ring-1 ring-line-strong"
    >
      {conflict && pipeline && (
        <Body
          key={conflict.id}
          c={conflict}
          p={pipeline}
          queue={queue}
          onNavigate={(id) => openResolver(id)}
          onClose={() => ref.current?.close()}
        />
      )}
    </dialog>
  );
}

function Body({ c, p, queue, onNavigate, onClose }: { c: Conflict; p: Pipeline; queue: Conflict[]; onNavigate: (id: string) => void; onClose: () => void }) {
  const resolve = useStore((s) => s.resolve);
  const now = useNow(15_000);
  const [picks, setPicks] = useState<Record<string, Side>>(() => newestPicks(c));
  const [preview, setPreview] = useState<Strategy | null>(null);

  const index = queue.findIndex((x) => x.id === c.id);
  const prev = queue[index - 1];
  const next = queue[index + 1];
  const a = SYSTEMS[p.source];
  const b = SYSTEMS[p.target];

  // Beim Überfahren von „A behalten“ / „B behalten“ zeigt die Ansicht, was dabei herauskäme.
  const shown: Record<string, Side> =
    preview === "a" || preview === "b" ? Object.fromEntries(c.fields.map((f) => [f.key, preview])) : picks;
  const sides = countSides(c, picks);
  const mixed = sides.a > 0 && sides.b > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "a") resolve(c.id, "a", picks);
      else if (k === "b") resolve(c.id, "b", picks);
      else if (k === "m") resolve(c.id, "merge", picks);
      else if (e.key === "ArrowLeft" && prev) onNavigate(prev.id);
      else if (e.key === "ArrowRight" && next) onNavigate(next.id);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [c.id, picks, prev, next, resolve, onNavigate]);

  return (
    <div className="flex max-h-[min(92dvh,860px)] flex-col">
      {/* Kopf */}
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Badge tone="warn">Konflikt {index + 1} von {queue.length}</Badge>
          <span className="min-w-0 truncate text-xs text-muted">{p.name} · erkannt {ago(c.detectedAt, now)}</span>
          <div className="-mr-2 ml-auto flex shrink-0 items-center gap-0.5">
            <Button size="sm" variant="ghost" onClick={() => prev && onNavigate(prev.id)} disabled={!prev} aria-label="Vorheriger Konflikt">
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => next && onNavigate(next.id)} disabled={!next} aria-label="Nächster Konflikt">
              <ChevronRight className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} aria-label="Schließen">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <h2 id="resolver-title" className="mt-1.5 text-lg font-semibold tracking-tight text-pretty text-ink sm:text-xl">
          {ENTITIES[c.entity].one} <span className="font-mono">{c.ref}</span>
          <span className="font-normal text-muted"> · {c.label}</span>
        </h2>
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {c.rule} {c.fields.length} {c.fields.length === 1 ? "Feld weicht" : "Felder weichen"} ab.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {/* Spaltenköpfe */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[150px_1fr_1fr]">
          <span className="hidden md:block" />
          <SideHead side="a" p={p} />
          <SideHead side="b" p={p} />
        </div>

        {/* Abweichende Felder */}
        <div className="mt-3 space-y-3">
          {c.fields.map((f) => (
            <FieldRow key={f.key} f={f} pick={shown[f.key]} now={now} a={a.name} b={b.name} onPick={(side) => setPicks((x) => ({ ...x, [f.key]: side }))} />
          ))}
        </div>

        {/* Übereinstimmende Felder */}
        {c.unchanged.length > 0 && (
          <details className="group mt-4 rounded-lg ring-1 ring-line">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-[13px] text-muted select-none hover:text-ink">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-ok" aria-hidden />
                {c.unchanged.length} {c.unchanged.length === 1 ? "Feld stimmt" : "Felder stimmen"} in beiden Systemen überein
                <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
              </span>
            </summary>
            <dl className="grid gap-x-6 gap-y-1.5 border-t border-line px-3 py-3 text-[13px] sm:grid-cols-2">
              {c.unchanged.map((u) => (
                <div key={u.label} className="flex gap-2">
                  <dt className="w-32 shrink-0 text-muted">{u.label}</dt>
                  <dd className="text-ink">{u.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        {/* Ergebnis */}
        <section aria-label="Ergebnis" className="mt-5 rounded-xl bg-sunken p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-ink">
              {preview === "a" ? `Ergebnis mit „${a.name} behalten“` : preview === "b" ? `Ergebnis mit „${b.name} behalten“` : "Ergebnis nach dem Zusammenführen"}
            </h3>
            <p className="text-xs text-muted">Wird in beide Systeme geschrieben.</p>
          </div>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {c.fields.map((f) => {
              const side = shown[f.key];
              return (
                <div key={f.key} className="flex min-w-0 items-start gap-2 rounded-lg bg-surface px-3 py-2 ring-1 ring-line">
                  <SystemMark id={side === "a" ? p.source : p.target} size="sm" />
                  <div className="min-w-0">
                    <dt className="text-[11.5px] text-muted">{f.label}</dt>
                    <dd className="truncate text-[13px] font-medium text-ink" title={side === "a" ? f.a : f.b}>{side === "a" ? f.a : f.b}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

      {/* Entscheidung */}
      <footer className="flex flex-col-reverse gap-3 border-t border-line bg-surface px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="hidden items-center gap-1.5 text-xs text-muted lg:flex">
          <Kbd>A</Kbd> <Kbd>B</Kbd> <Kbd>M</Kbd> entscheiden · <Kbd>←</Kbd> <Kbd>→</Kbd> blättern · <Kbd>Esc</Kbd> schließen
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            onClick={() => resolve(c.id, "a", picks)}
            onMouseEnter={() => setPreview("a")}
            onMouseLeave={() => setPreview(null)}
            onFocus={() => setPreview("a")}
            onBlur={() => setPreview(null)}
          >
            <SystemMark id={p.source} size="sm" />
            {a.name} behalten
          </Button>
          <Button
            onClick={() => resolve(c.id, "b", picks)}
            onMouseEnter={() => setPreview("b")}
            onMouseLeave={() => setPreview(null)}
            onFocus={() => setPreview("b")}
            onBlur={() => setPreview(null)}
          >
            <SystemMark id={p.target} size="sm" />
            {b.name} behalten
          </Button>
          <Button variant="primary" className="col-span-2" onClick={() => resolve(c.id, "merge", picks)}>
            <GitMerge className="size-4" aria-hidden />
            {mixed ? `Zusammenführen (${sides.a} + ${sides.b})` : `Zusammenführen`}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function SideHead({ side, p }: { side: Side; p: Pipeline }) {
  const id = side === "a" ? p.source : p.target;
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-lg px-1">
      <SystemMark id={id} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{SYSTEMS[id].name}</p>
        <p className="text-xs text-muted">System {side.toUpperCase()} · {side === "a" ? "Quelle" : "Ziel"}</p>
      </div>
    </div>
  );
}

function FieldRow({
  f,
  pick,
  now,
  a,
  b,
  onPick,
}: {
  f: ConflictField;
  pick: Side;
  now: number;
  a: string;
  b: string;
  onPick: (side: Side) => void;
}) {
  const newer: Side = f.aAt >= f.bAt ? "a" : "b";
  return (
    <div role="radiogroup" aria-label={f.label} className="grid grid-cols-2 gap-3 md:grid-cols-[150px_1fr_1fr]">
      <p className="col-span-2 text-[13px] font-medium text-ink md:col-span-1 md:pt-3">{f.label}</p>
      {(["a", "b"] as const).map((side) => {
        const selected = pick === side;
        const value = side === "a" ? f.a : f.b;
        const other = side === "a" ? f.b : f.a;
        const at = side === "a" ? f.aAt : f.bAt;
        return (
          <button
            key={side}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${f.label}: ${value} aus ${side === "a" ? a : b}`}
            onClick={() => onPick(side)}
            className={cx(
              "group relative min-w-0 rounded-lg px-3 py-2.5 text-left ring-1 transition-[background-color,box-shadow] duration-150",
              selected ? "bg-accent-soft/60 ring-2 ring-accent" : "bg-surface ring-line-strong hover:bg-sunken",
            )}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0 text-[14px] leading-snug font-medium break-words text-ink">
                <Diff value={value} other={other} />
              </span>
              <span
                aria-hidden
                className={cx(
                  "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full ring-1 transition-colors",
                  selected ? "bg-accent text-white ring-accent dark:text-[#0b0d1c]" : "ring-line-strong",
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
              <span title={new Date(at).toLocaleString("de-DE")}>geändert {ago(at, now)} · {clock(at, false)}</span>
              {newer === side && <Badge tone="pend" className="h-4 px-1 text-[10.5px]">jünger</Badge>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
