import { ImageResponse } from "next/og";

/** Vorschaubild beim Teilen: Name, drei Kennzahlen, Hinweis auf die Demo. Wird beim Bauen erzeugt. */
export const runtime = "nodejs";
export const alt = "Abgleich: Dashboard für Datensynchronisation mit Konfliktlösung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const items = [
  { label: "Pipelines", value: "Shop → ERP", color: "#4b45d8" },
  { label: "Synchronisiert", value: "Verlauf", color: "#0f7f57" },
  { label: "Konflikte", value: "A · B · Merge", color: "#a35a06" },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f3f4f7",
          color: "#0d1321",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#0d1321", display: "flex", flexDirection: "column", justifyContent: "center", padding: 12, gap: 8 }}>
            <div style={{ height: 5, width: 30, borderRadius: 3, background: "#fff" }} />
            <div style={{ height: 5, width: 30, borderRadius: 3, background: "#8c88f7", marginLeft: 2 }} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>Abgleich</div>
          <div style={{ marginLeft: "auto", fontSize: 22, color: "#586174" }}>Demo · erfundene Daten</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>Shop, ERP, CRM und Buchhaltung im Gleichtakt.</div>
          <div style={{ marginTop: 20, fontSize: 30, color: "#586174" }}>Jeder Datensatz nachvollziehbar, jeder Konflikt mit einem Klick entschieden.</div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {items.map((i) => (
            <div
              key={i.label}
              style={{ display: "flex", flexDirection: "column", flex: 1, background: "#fff", borderRadius: 18, padding: "22px 26px", border: "1px solid rgba(14,22,40,0.09)" }}
            >
              <div style={{ fontSize: 22, color: "#586174" }}>{i.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 36, fontWeight: 600 }}>
                <div style={{ width: 14, height: 14, borderRadius: 999, background: i.color }} />
                {i.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
