import { describe, expect, it } from "vitest";
import { makeConflict, makeRecord, mulberry32, settle } from "../lib/generate";
import { countSides, effectiveStrategy, newestPicks, picksFor, valuesFor } from "../lib/resolve";
import { seed } from "../lib/seed";
import type { Conflict } from "../lib/types";

const conflict: Conflict = {
  id: "c1",
  recordId: "r1",
  pipelineId: "p",
  entity: "customer",
  ref: "K-1",
  label: "Test",
  detectedAt: 1000,
  rule: "",
  unchanged: [],
  fields: [
    { key: "name", label: "Name", a: "Max Mustermann", b: "Maximilian Mustermann", aAt: 500, bAt: 400 },
    { key: "phone", label: "Telefon", a: "1", b: "2", aAt: 100, bAt: 300 },
  ],
};

describe("Konfliktlösung", () => {
  it("schlägt je Feld die jüngere Änderung vor", () => {
    expect(newestPicks(conflict)).toEqual({ name: "a", phone: "b" });
  });

  it("A behalten überschreibt die Feldauswahl", () => {
    const picks = picksFor(conflict, "a", { name: "b", phone: "b" });
    expect(valuesFor(conflict, picks)).toEqual({ name: "Max Mustermann", phone: "1" });
  });

  it("Zusammenführen nimmt die Auswahl je Feld", () => {
    const picks = picksFor(conflict, "merge", { name: "b", phone: "a" });
    expect(valuesFor(conflict, picks)).toEqual({ name: "Maximilian Mustermann", phone: "1" });
    expect(countSides(conflict, picks)).toEqual({ a: 1, b: 1 });
    expect(effectiveStrategy(conflict, "merge", picks)).toBe("merge");
  });

  it("Zusammenführen mit nur einer Seite zählt als diese Seite", () => {
    expect(effectiveStrategy(conflict, "merge", { name: "b", phone: "b" })).toBe("b");
  });

  it("fehlende Auswahl fällt auf A zurück", () => {
    expect(picksFor(conflict, "merge", {})).toEqual({ name: "a", phone: "a" });
  });
});

describe("Simulation", () => {
  it("Szenario erzwingt Konflikt oder Fehler beim ersten Datensatz", () => {
    const rng = mulberry32(1);
    expect(settle(rng, 0, "conflict")).toBe("conflict");
    expect(settle(rng, 0, "failure")).toBe("failed");
  });

  it("Ausgangsstand ist reproduzierbar und hat drei offene Konflikte", () => {
    const a = seed(1_800_000_000_000);
    const b = seed(1_800_000_000_000);
    expect(a.records.map((r) => r.ref)).toEqual(b.records.map((r) => r.ref));
    expect(a.conflicts).toHaveLength(3);
    expect(a.conflicts.every((c) => a.records.find((r) => r.id === c.recordId)?.status === "conflict")).toBe(true);
    expect(a.records.filter((r) => r.status === "failed")).toHaveLength(3);
  });

  it("Fehler tragen eine Ursache, Konflikte unterschiedliche Werte", () => {
    const rng = mulberry32(7);
    const [p] = seed(Date.now()).pipelines;
    const failed = makeRecord(rng, p, Date.now(), "failed");
    expect(failed.message).toBeTruthy();
    expect(typeof failed.retryable).toBe("boolean");
    const c = makeConflict(rng, makeRecord(rng, p, Date.now(), "conflict"), Date.now());
    expect(c.fields.every((f) => f.a !== f.b)).toBe(true);
  });
});
