import type { Entity, Status, SystemId } from "./types";

/** Systeme als Monogramm, bewusst ohne Herstellerlogos. */
export const SYSTEMS: Record<SystemId, { name: string; short: string; kind: string; color: string }> = {
  shopify: { name: "Shopify", short: "SH", kind: "Webshop", color: "#4f8a2b" },
  sap: { name: "SAP S/4HANA", short: "SAP", kind: "ERP", color: "#1f6fd1" },
  hubspot: { name: "HubSpot", short: "HS", kind: "Marketing-CRM", color: "#d9612b" },
  salesforce: { name: "Salesforce", short: "SF", kind: "Vertriebs-CRM", color: "#0f8bc6" },
  stripe: { name: "Stripe", short: "ST", kind: "Zahlungen", color: "#5b54d6" },
  datev: { name: "DATEV", short: "DV", kind: "Buchhaltung", color: "#2f8a55" },
};

export const ENTITIES: Record<Entity, { one: string; many: string }> = {
  customer: { one: "Kunde", many: "Kunden" },
  order: { one: "Bestellung", many: "Bestellungen" },
  invoice: { one: "Rechnung", many: "Rechnungen" },
};

export const STATUS: Record<Status, { label: string; tone: "ok" | "bad" | "pend" | "warn" }> = {
  synced: { label: "Synchronisiert", tone: "ok" },
  failed: { label: "Fehlgeschlagen", tone: "bad" },
  pending: { label: "Ausstehend", tone: "pend" },
  conflict: { label: "Konflikt", tone: "warn" },
};

export const STAGES = [
  { label: "Extrahieren", ms: 750 },
  { label: "Transformieren", ms: 900 },
  { label: "Abgleichen", ms: 850 },
  { label: "Schreiben", ms: 950 },
] as const;
