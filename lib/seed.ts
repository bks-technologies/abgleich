import { between, makeConflict, makeRecord, mulberry32 } from "./generate";
import type { Conflict, Pipeline, SyncRecord } from "./types";

export interface Data {
  pipelines: Pipeline[];
  records: SyncRecord[];
  conflicts: Conflict[];
}

const BASE_PIPELINES: Omit<Pipeline, "lastRunAt" | "lastRunResult" | "run">[] = [
  { id: "p_shop_sap", name: "Webshop-Bestellungen", source: "shopify", target: "sap", entity: "order", schedule: "alle 5 Min.", twoWay: false, paused: false },
  { id: "p_hs_sf", name: "CRM-Kontakte", source: "hubspot", target: "salesforce", entity: "customer", schedule: "alle 15 Min.", twoWay: true, paused: false },
  { id: "p_stripe_datev", name: "Zahlungen an die Buchhaltung", source: "stripe", target: "datev", entity: "invoice", schedule: "stündlich", twoWay: false, paused: false },
  { id: "p_sap_shop", name: "Kundenstamm in den Shop", source: "sap", target: "shopify", entity: "customer", schedule: "täglich 02:00", twoWay: false, paused: true },
];

/** Läufe je Pipeline in den letzten 24 Stunden (Abstand in Minuten). */
const CADENCE: Record<string, number> = { p_shop_sap: 25, p_hs_sf: 45, p_stripe_datev: 60, p_sap_shop: 24 * 60 };

/** Ausgangsstand: 24 Stunden Verlauf, drei offene Konflikte, ein paar Fehler. Immer gleich (fester Zufall). */
export function seed(now: number): Data {
  const rng = mulberry32(20261002);
  const records: SyncRecord[] = [];
  const conflicts: Conflict[] = [];
  const pipelines: Pipeline[] = BASE_PIPELINES.map((p) => ({ ...p, run: null, lastRunAt: now, lastRunResult: "ok" }));

  for (const p of pipelines) {
    const step = CADENCE[p.id] * 60_000;
    // Der pausierte Kundenstamm lief zuletzt vor 20 Stunden.
    const newest = p.paused ? now - 20 * 3_600_000 : now - between(rng, 2, 9) * 60_000;
    p.lastRunAt = newest;
    for (let t = newest; t > now - 24 * 3_600_000; t -= step) {
      const n = p.paused ? 9 : between(rng, 1, 3);
      for (let i = 0; i < n; i++) {
        const at = t - i * between(rng, 400, 2500);
        // Der Verlauf ist sauber durchgelaufen; offene Fehler und Konflikte werden unten gezielt gesetzt.
        records.push(makeRecord(rng, p, at, "synced"));
      }
    }
  }

  const [shop, crm, pay] = pipelines;

  // Drei offene Konflikte, je Datentyp einer.
  const open: [Pipeline, number][] = [[crm, 12], [shop, 34], [pay, 71]];
  for (const [p, minutes] of open) {
    const r = makeRecord(rng, p, now - minutes * 60_000, "conflict");
    const c = makeConflict(rng, r, r.at, 0);
    r.conflictId = c.id;
    r.label = c.label;
    records.push(r);
    conflicts.push(c);
  }

  // Drei Fehler; ob erneutes Senden hilft, hängt an der Ursache.
  const failures: [Pipeline, number][] = [[shop, 18], [crm, 52], [pay, 140]];
  for (const [p, minutes] of failures) records.push(makeRecord(rng, p, now - minutes * 60_000, "failed"));

  // Zwei Datensätze warten noch in der Schlange des CRM.
  for (const s of [40, 70]) records.push(makeRecord(rng, crm, now - s * 1000, "pending"));

  shop.lastRunResult = "partial";
  pay.lastRunResult = "partial";

  records.sort((a, b) => b.at - a.at);
  return { pipelines, records, conflicts };
}
