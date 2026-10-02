import type { Conflict, Entity, Pipeline, Status, SyncRecord, SystemId } from "./types";

/** Alle Firmen, Personen und Beträge sind erfunden. */

export type Rng = () => number;

/** Kleiner deterministischer Zufall, damit der Ausgangsstand nach jedem Zurücksetzen gleich aussieht. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];
export const between = (rng: Rng, min: number, max: number) => Math.round(min + rng() * (max - min));

const COMPANIES = [
  "Kessler Logistik KG",
  "Nordlicht Medien GmbH",
  "Huber Gastro OHG",
  "Alpenland Getränke GmbH",
  "Weber & Söhne Metallbau",
  "Lechner Fahrzeugteile",
  "Bergmann Praxisbedarf",
  "Seidl Elektrotechnik",
  "Brunner Holzbau GmbH",
  "Isartal Reisemobile",
  "Fuchs Laborservice",
  "Schreiner Objektmöbel",
] as const;

const PEOPLE = [
  "Anna Schröder",
  "Jonas Weber",
  "Lena Hofmann",
  "Tobias Brandl",
  "Miriam Koch",
  "Felix Wagner",
  "Sophie Lindner",
  "Daniel Maier",
  "Julia Krämer",
  "Lukas Zimmermann",
] as const;

const euro = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

let counter = 0;
export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export function makeRef(rng: Rng, entity: Entity, source: SystemId): { ref: string; label: string } {
  const company = pick(rng, COMPANIES);
  if (entity === "order") {
    const no = between(rng, 10200, 10999);
    return { ref: `#${no}`, label: `${company} · ${between(rng, 1, 14)} Positionen` };
  }
  if (entity === "invoice") {
    const no = between(rng, 1100, 1999);
    return { ref: `RE-2026-${no}`, label: `${company} · ${euro(between(rng, 4900, 489000))}` };
  }
  const prefix = source === "hubspot" ? "HS" : source === "sap" ? "KD" : "K";
  return { ref: `${prefix}-${between(rng, 20000, 29999)}`, label: `${pick(rng, PEOPLE)} · ${company}` };
}

/** Fehlermeldungen je Zielsystem. Nicht wiederholbare Fehler scheitern beim erneuten Senden wieder. */
const ERRORS: Record<SystemId, { message: string; retryable: boolean }[]> = {
  sap: [
    { message: "RFC BAPI_SALESORDER_CREATE: Pflichtfeld Steuerkennzeichen fehlt (VBAK-TAXK1)", retryable: false },
    { message: "Zeitüberschreitung nach 30 s, Gateway antwortet nicht", retryable: true },
  ],
  salesforce: [
    { message: "API 429: Anfragelimit erreicht, nächster Versuch in 30 s", retryable: true },
    { message: "DUPLICATE_VALUE: E-Mail-Adresse existiert bereits an anderem Kontakt", retryable: false },
  ],
  datev: [
    { message: "Buchungsperiode 09/2026 ist festgeschrieben", retryable: false },
    { message: "Verbindung zum DATEV-Rechenzentrum unterbrochen", retryable: true },
  ],
  shopify: [
    { message: "API 422: Postleitzahl ungültig für Land DE", retryable: false },
    { message: "API 503: Dienst vorübergehend nicht erreichbar", retryable: true },
  ],
  hubspot: [{ message: "API 502: Bad Gateway", retryable: true }],
  stripe: [{ message: "Webhook-Signatur abgelaufen", retryable: true }],
};

export function makeError(rng: Rng, target: SystemId) {
  return pick(rng, ERRORS[target]);
}

/** Konfliktvorlagen: welche Felder beide Seiten seit dem letzten Abgleich unterschiedlich geändert haben. */
type FieldPair = { key: string; label: string; a: string; b: string };
type Template = { rule: string; fields: FieldPair[]; unchanged: { label: string; value: string }[]; label: string };

const CUSTOMER_TEMPLATES: Template[] = [
  {
    label: "Max Mustermann · Mustermann Haustechnik GmbH",
    rule: "Beide Systeme haben den Kontakt seit dem letzten Abgleich geändert.",
    fields: [
      { key: "name", label: "Name", a: "Max Mustermann", b: "Maximilian Mustermann" },
      { key: "email", label: "E-Mail", a: "m.mustermann@mustermann-ht.de", b: "max.mustermann@mustermann-ht.de" },
      { key: "phone", label: "Telefon", a: "+49 8171 44 20", b: "+49 8171 44 20 0" },
    ],
    unchanged: [
      { label: "Firma", value: "Mustermann Haustechnik GmbH" },
      { label: "Ort", value: "82538 Geretsried" },
      { label: "Kundengruppe", value: "B2B Bestand" },
    ],
  },
  {
    label: "Erika Musterfrau · Nordlicht Medien GmbH",
    rule: "Beide Systeme haben den Kontakt seit dem letzten Abgleich geändert.",
    fields: [
      { key: "name", label: "Name", a: "Erika Musterfrau", b: "Dr. Erika Musterfrau" },
      { key: "position", label: "Position", a: "Einkauf", b: "Leitung Einkauf" },
      { key: "phone", label: "Telefon", a: "+49 89 120 33 41", b: "+49 151 220 33 41" },
    ],
    unchanged: [
      { label: "Firma", value: "Nordlicht Medien GmbH" },
      { label: "E-Mail", value: "e.musterfrau@nordlicht-medien.de" },
    ],
  },
];

const ORDER_TEMPLATES: Template[] = [
  {
    label: "Kessler Logistik KG · 4 Positionen",
    rule: "Bestellung wurde im Shop und im ERP nach der Übertragung bearbeitet.",
    fields: [
      { key: "address", label: "Lieferadresse", a: "Industriestraße 12, 82538 Geretsried", b: "Industriestr. 12a, 82538 Geretsried" },
      { key: "qty", label: "Menge Pos. 2", a: "24 Stück", b: "20 Stück" },
      { key: "state", label: "Zahlstatus", a: "Bezahlt", b: "Offen" },
    ],
    unchanged: [
      { label: "Kunde", value: "Kessler Logistik KG" },
      { label: "Versandart", value: "Spedition" },
    ],
  },
  {
    label: "Huber Gastro OHG · 2 Positionen",
    rule: "Bestellung wurde im Shop und im ERP nach der Übertragung bearbeitet.",
    fields: [
      { key: "date", label: "Liefertermin", a: "08.10.2026", b: "10.10.2026" },
      { key: "note", label: "Hinweis", a: "Anlieferung über Hof", b: "Bitte vorher anrufen" },
    ],
    unchanged: [
      { label: "Kunde", value: "Huber Gastro OHG" },
      { label: "Summe", value: "2.318,00 €" },
    ],
  },
];

const INVOICE_TEMPLATES: Template[] = [
  {
    label: "Alpenland Getränke GmbH",
    rule: "Betrag weicht ab, erlaubte Toleranz 0,00 €.",
    fields: [
      { key: "gross", label: "Betrag brutto", a: "1.284,50 €", b: "1.248,50 €" },
      { key: "due", label: "Fällig am", a: "16.10.2026", b: "14.10.2026" },
      { key: "paid", label: "Zahlstatus", a: "Bezahlt (Karte)", b: "Offen" },
    ],
    unchanged: [
      { label: "Rechnungsempfänger", value: "Alpenland Getränke GmbH" },
      { label: "Steuersatz", value: "19 %" },
    ],
  },
  {
    label: "Weber & Söhne Metallbau",
    rule: "Betrag weicht ab, erlaubte Toleranz 0,00 €.",
    fields: [
      { key: "gross", label: "Betrag brutto", a: "3.570,00 €", b: "3.000,00 €" },
      { key: "tax", label: "Steuersatz", a: "19 %", b: "0 % (Reverse Charge)" },
    ],
    unchanged: [
      { label: "Rechnungsempfänger", value: "Weber & Söhne Metallbau" },
      { label: "Fällig am", value: "20.10.2026" },
    ],
  },
];

const TEMPLATES: Record<Entity, Template[]> = {
  customer: CUSTOMER_TEMPLATES,
  order: ORDER_TEMPLATES,
  invoice: INVOICE_TEMPLATES,
};

export function makeConflict(rng: Rng, record: SyncRecord, now: number, index?: number): Conflict {
  const list = TEMPLATES[record.entity];
  const t = index === undefined ? pick(rng, list) : list[index % list.length];
  return {
    id: uid("c"),
    recordId: record.id,
    pipelineId: record.pipelineId,
    entity: record.entity,
    ref: record.ref,
    label: t.label,
    detectedAt: now,
    rule: t.rule,
    unchanged: t.unchanged,
    // Jede Seite hat ihr Feld zu einem eigenen Zeitpunkt geändert; das Neuere ist der Vorschlag beim Zusammenführen.
    fields: t.fields.map((f) => ({
      ...f,
      aAt: now - between(rng, 3, 180) * 60_000,
      bAt: now - between(rng, 3, 180) * 60_000,
    })),
  };
}

/** Ein Lauf liefert ein paar Datensätze; das Szenario erzwingt bei Bedarf einen Konflikt oder Fehler. */
export function settle(rng: Rng, index: number, scenario: "normal" | "conflict" | "failure"): Exclude<Status, "pending"> {
  if (index === 0 && scenario === "conflict") return "conflict";
  if (index === 0 && scenario === "failure") return "failed";
  const r = rng();
  if (r < 0.05) return "failed";
  if (r < 0.09) return "conflict";
  return "synced";
}

export function makeRecord(rng: Rng, p: Pipeline, at: number, status: Status, runId?: string): SyncRecord {
  const { ref, label } = makeRef(rng, p.entity, p.source);
  const rec: SyncRecord = { id: uid("r"), pipelineId: p.id, entity: p.entity, ref, label, status, at, attempts: 1, runId };
  if (status !== "pending") rec.durationMs = between(rng, 90, 1400);
  if (status === "failed") {
    const e = makeError(rng, p.target);
    rec.message = e.message;
    rec.retryable = e.retryable;
  }
  return rec;
}
