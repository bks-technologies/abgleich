import type { Conflict, Side, Strategy } from "./types";

/** Vorschlag fürs Zusammenführen: je Feld gewinnt die jüngere Änderung. */
export function newestPicks(c: Conflict): Record<string, Side> {
  return Object.fromEntries(c.fields.map((f) => [f.key, f.aAt >= f.bAt ? "a" : "b"]));
}

export function picksFor(c: Conflict, strategy: Strategy, picks: Record<string, Side>): Record<string, Side> {
  if (strategy === "merge") return Object.fromEntries(c.fields.map((f) => [f.key, picks[f.key] ?? "a"]));
  return Object.fromEntries(c.fields.map((f) => [f.key, strategy]));
}

export function valuesFor(c: Conflict, picks: Record<string, Side>): Record<string, string> {
  return Object.fromEntries(c.fields.map((f) => [f.key, picks[f.key] === "b" ? f.b : f.a]));
}

/** Zusammenführen mit lauter gleichen Seiten ist in Wahrheit „A behalten“ oder „B behalten“. */
export function effectiveStrategy(c: Conflict, strategy: Strategy, picks: Record<string, Side>): Strategy {
  if (strategy !== "merge") return strategy;
  const sides = new Set(c.fields.map((f) => picks[f.key] ?? "a"));
  return sides.size === 1 ? ([...sides][0] as Side) : "merge";
}

export function countSides(c: Conflict, picks: Record<string, Side>) {
  const b = c.fields.filter((f) => picks[f.key] === "b").length;
  return { a: c.fields.length - b, b };
}
