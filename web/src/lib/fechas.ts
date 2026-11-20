import { TIMEZONE } from "./config";

const partes = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );

/** "2026-11-20 10:30:00" en hora de Bogotá */
export function ahora(d = new Date()): string {
  const p = partes(d);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** "2026-11-20" en Bogotá */
export function hoy(d = new Date()): string {
  return ahora(d).slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "26 oct 2026" */
export function fechaCorta(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || "")) return iso || "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

/** "sábado 26 oct 2026" */
export function fechaLarga(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || "")) return iso || "";
  const dia = new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay();
  return `${DIAS[dia]} ${fechaCorta(iso)}`;
}

export function mesCorto(iso: string): string {
  const m = Number(iso.slice(5, 7));
  return MESES[m - 1] ?? "";
}
