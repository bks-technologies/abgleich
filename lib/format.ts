export const num = (n: number) => n.toLocaleString("de-DE");

export function clock(at: number, seconds = true) {
  return new Date(at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) });
}

export function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "gerade eben";
  if (s < 60) return `vor ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "vor 1 Tag" : `vor ${d} Tagen`;
}

export function duration(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s`;
}

export const percent = (x: number) => `${(x * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
