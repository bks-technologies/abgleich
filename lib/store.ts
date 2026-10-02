"use client";

import { create } from "zustand";
import { between, makeConflict, makeError, makeRecord, settle, uid } from "./generate";
import { countSides, effectiveStrategy, picksFor, valuesFor } from "./resolve";
import { seed, type Data } from "./seed";
import { ENTITIES, STAGES, SYSTEMS } from "./systems";
import type { Conflict, Pipeline, Scenario, Side, Strategy, SyncRecord } from "./types";

/**
 * Der gesamte Zustand der Demo. Kein Backend: Läufe, Fehler und Konflikte werden hier simuliert
 * und im localStorage gehalten, damit ein Neuladen nichts verliert.
 */

const KEY = "abgleich:v1";
const MAX_RECORDS = 400;
/** Älterer gespeicherter Stand wird verworfen, sonst sieht ein wiederkehrender Besucher „letzter Lauf vor 3 Tagen“. */
const MAX_AGE = 6 * 3_600_000;

export type Tone = "ok" | "bad" | "warn" | "info";
export interface Toast {
  id: string;
  tone: Tone;
  title: string;
  body?: string;
}

interface State extends Data {
  ready: boolean;
  openConflictId: string | null;
  toasts: Toast[];
  init: () => void;
  trigger: (pipelineId: string, scenario?: Scenario) => void;
  triggerAll: (scenario?: Scenario) => void;
  togglePause: (pipelineId: string) => void;
  retry: (recordId: string) => void;
  retryAll: () => void;
  resolve: (conflictId: string, strategy: Strategy, picks: Record<string, Side>) => void;
  openResolver: (conflictId: string | null) => void;
  reset: () => void;
  dismissToast: (id: string) => void;
}

const rng = Math.random;
const timers = new Set<ReturnType<typeof setTimeout>>();
function later(ms: number, fn: () => void) {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
}

export const useStore = create<State>()((set, get) => {
  const patchPipeline = (id: string, patch: Partial<Pipeline> | ((p: Pipeline) => Partial<Pipeline>)) =>
    set((s) => ({
      pipelines: s.pipelines.map((p) => (p.id === id ? { ...p, ...(typeof patch === "function" ? patch(p) : patch) } : p)),
    }));

  const patchRecord = (id: string, patch: Partial<SyncRecord>) =>
    set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const toast = (t: Omit<Toast, "id">) => {
    const id = uid("t");
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    later(4500, () => get().dismissToast(id));
  };

  /** Wartende Datensätze ohne laufenden Prozess (Ausgangsstand, abgebrochene Läufe) nach und nach abarbeiten. */
  const drain = () => {
    const pending = get().records.filter((r) => r.status === "pending");
    pending.forEach((r, i) => {
      later(2500 + i * 1400, () => {
        if (get().records.find((x) => x.id === r.id)?.status === "pending") patchRecord(r.id, { status: "synced", at: Date.now(), durationMs: between(rng, 120, 900) });
      });
    });
  };

  /** Ein Lauf: vier Stufen mit Fortschritt, danach bekommt jeder Datensatz sein Ergebnis. */
  const run = (p: Pipeline, scenario: Scenario) => {
    const runId = uid("run");
    const startedAt = Date.now();
    const count = between(rng, 2, 5);
    const fresh = Array.from({ length: count }, (_, i) => makeRecord(rng, p, startedAt - i * 37, "pending", runId));

    set((s) => ({ records: [...fresh, ...s.records].slice(0, MAX_RECORDS) }));
    patchPipeline(p.id, { run: { id: runId, stage: 0, progress: 0, startedAt, scenario } });

    const total = STAGES.reduce((sum, st) => sum + st.ms, 0);
    const tick = 80;
    let elapsed = 0;
    const step = () => {
      const current = get().pipelines.find((x) => x.id === p.id);
      if (current?.run?.id !== runId) return; // zurückgesetzt
      elapsed += tick;
      if (elapsed < total) {
        let acc = 0;
        let stage = 0;
        for (let i = 0; i < STAGES.length; i++) {
          if (elapsed < acc + STAGES[i].ms) {
            stage = i;
            break;
          }
          acc += STAGES[i].ms;
        }
        patchPipeline(p.id, (x) => ({ run: x.run && { ...x.run, stage, progress: elapsed / total } }));
        later(tick, step);
        return;
      }
      finish();
    };

    const finish = () => {
      const now = Date.now();
      const newConflicts: Conflict[] = [];
      const counts = { synced: 0, failed: 0, conflict: 0 };
      set((s) => ({
        records: s.records.map((r) => {
          if (r.runId !== runId || r.status !== "pending") return r;
          const index = fresh.findIndex((f) => f.id === r.id);
          const status = settle(rng, index, scenario);
          counts[status]++;
          const done: SyncRecord = { ...r, status, at: now - (fresh.length - 1 - index) * 41, durationMs: between(rng, 90, 1300) };
          if (status === "failed") {
            const e = makeError(rng, p.target);
            done.message = e.message;
            done.retryable = e.retryable;
          }
          if (status === "conflict") {
            const c = makeConflict(rng, done, now);
            done.conflictId = c.id;
            done.label = c.label;
            newConflicts.push(c);
          }
          return done;
        }),
        conflicts: [...newConflicts, ...s.conflicts],
      }));
      patchPipeline(p.id, {
        run: null,
        lastRunAt: now,
        lastRunResult: counts.failed + counts.conflict === 0 ? "ok" : counts.synced === 0 ? "failed" : "partial",
      });
      const parts = [`${counts.synced} synchronisiert`];
      if (counts.failed) parts.push(`${counts.failed} fehlgeschlagen`);
      if (counts.conflict) parts.push(`${counts.conflict} ${counts.conflict === 1 ? "Konflikt" : "Konflikte"}`);
      toast({ tone: counts.failed ? "bad" : counts.conflict ? "warn" : "ok", title: p.name, body: parts.join(" · ") });
    };

    later(tick, step);
  };

  return {
    pipelines: [],
    records: [],
    conflicts: [],
    ready: false,
    openConflictId: null,
    toasts: [],

    init: () => {
      if (get().ready) return;
      let data: (Data & { savedAt?: number }) | null = null;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) data = JSON.parse(raw) as Data & { savedAt?: number };
      } catch {
        data = null;
      }
      const fresh = !!data?.savedAt && Date.now() - data.savedAt < MAX_AGE;
      if (!fresh || !data?.pipelines?.length) data = seed(Date.now());
      const { pipelines, records, conflicts } = data;
      data = { pipelines, records, conflicts };
      // Ein beim Neuladen unterbrochener Lauf gilt als abgebrochen; seine Datensätze arbeitet drain() ab.
      data.pipelines = data.pipelines.map((p) => ({ ...p, run: null }));
      set({ ...data, ready: true });
      drain();
    },

    trigger: (pipelineId, scenario = "normal") => {
      const p = get().pipelines.find((x) => x.id === pipelineId);
      if (!p || p.run) return;
      if (p.paused) {
        toast({ tone: "info", title: `${p.name} ist pausiert`, body: "Erst fortsetzen, dann synchronisieren." });
        return;
      }
      run(p, scenario);
    },

    triggerAll: (scenario = "normal") => {
      get()
        .pipelines.filter((p) => !p.paused && !p.run)
        .forEach((p, i) => later(i * 220, () => get().trigger(p.id, i === 0 ? scenario : "normal")));
    },

    togglePause: (pipelineId) => {
      const p = get().pipelines.find((x) => x.id === pipelineId);
      if (!p || p.run) return;
      patchPipeline(pipelineId, { paused: !p.paused });
      toast({ tone: "info", title: p.paused ? `${p.name} läuft wieder` : `${p.name} pausiert`, body: p.paused ? `Nächster Lauf ${p.schedule}.` : "Geplante Läufe werden ausgesetzt." });
    },

    retry: (recordId) => {
      const r = get().records.find((x) => x.id === recordId);
      if (!r || r.status !== "failed") return;
      const attempts = r.attempts + 1;
      patchRecord(recordId, { status: "pending", attempts });
      later(1100 + between(rng, 0, 600), () => {
        const cur = get().records.find((x) => x.id === recordId);
        if (cur?.status !== "pending") return;
        // Nicht wiederholbare Ursachen (fehlendes Pflichtfeld, festgeschriebene Periode) scheitern wieder.
        if (!r.retryable) {
          patchRecord(recordId, { status: "failed", at: Date.now() });
          toast({ tone: "bad", title: `${r.ref} erneut fehlgeschlagen`, body: "Die Ursache liegt in den Daten, erneutes Senden hilft nicht." });
        } else {
          patchRecord(recordId, { status: "synced", at: Date.now(), message: `Im ${attempts}. Versuch übertragen`, durationMs: between(rng, 150, 900) });
        }
      });
    },

    retryAll: () => {
      get()
        .records.filter((r) => r.status === "failed")
        .forEach((r, i) => later(i * 150, () => get().retry(r.id)));
    },

    resolve: (conflictId, strategy, picks) => {
      const c = get().conflicts.find((x) => x.id === conflictId);
      if (!c || c.resolution) return;
      const p = get().pipelines.find((x) => x.id === c.pipelineId);
      const final = picksFor(c, strategy, picks);
      const effective = effectiveStrategy(c, strategy, final);
      const now = Date.now();
      const a = p ? SYSTEMS[p.source].name : "A";
      const b = p ? SYSTEMS[p.target].name : "B";
      const sides = countSides(c, final);
      const message =
        effective === "a" ? `Konflikt gelöst: ${a} übernommen` : effective === "b" ? `Konflikt gelöst: ${b} übernommen` : `Konflikt gelöst: zusammengeführt (${sides.a} aus ${a}, ${sides.b} aus ${b})`;

      set((s) => ({
        conflicts: s.conflicts.map((x) => (x.id === conflictId ? { ...x, resolution: { strategy: effective, picks: final, values: valuesFor(c, final), at: now } } : x)),
        records: s.records.map((r) => (r.id === c.recordId ? { ...r, status: "synced", at: now, message, durationMs: between(rng, 120, 600) } : r)),
      }));

      // Im Resolver direkt zum nächsten offenen Konflikt, sonst schließen.
      const next = get().conflicts.find((x) => !x.resolution);
      set({ openConflictId: next?.id ?? null });
      toast({ tone: "ok", title: `${ENTITIES[c.entity].one} ${c.ref}`, body: message.replace("Konflikt gelöst: ", "") });
    },

    openResolver: (conflictId) => set({ openConflictId: conflictId }),

    reset: () => {
      timers.forEach(clearTimeout);
      timers.clear();
      set({ ...seed(Date.now()), openConflictId: null, toasts: [] });
      drain();
      toast({ tone: "info", title: "Demo zurückgesetzt", body: "Ausgangsstand mit drei offenen Konflikten." });
    },

    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

// Speichern, sobald sich Daten ändern (gebündelt, nicht bei jedem Fortschritts-Tick einzeln).
if (typeof window !== "undefined") {
  let pending: ReturnType<typeof setTimeout> | null = null;
  useStore.subscribe((s, prev) => {
    if (!s.ready || (s.pipelines === prev.pipelines && s.records === prev.records && s.conflicts === prev.conflicts)) return;
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      const { pipelines, records, conflicts } = useStore.getState();
      try {
        localStorage.setItem(KEY, JSON.stringify({ pipelines, records, conflicts, savedAt: Date.now() }));
      } catch {
        // Speicher voll oder gesperrt (privates Fenster): die Demo läuft trotzdem, nur ohne Gedächtnis.
      }
    }, 400);
  });
}
