import { redirect } from "next/navigation";

/** Redirige con un mensaje en la URL (?ok= o ?error=). */
export function volver(ruta: string, m: { ok?: string; error?: string } = {}): never {
  const [p, q] = ruta.split("?");
  const qs = new URLSearchParams(q);
  if (m.ok) qs.set("ok", m.ok);
  if (m.error) qs.set("error", m.error);
  const s = qs.toString();
  redirect(s ? `${p}?${s}` : p);
}

export const txt = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
export const entero = (fd: FormData, k: string, d = 0) => {
  const n = parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isFinite(n) ? n : d;
};
export const arroba = (s: string) => {
  const t = s.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/+$/, "").replace(/^@/, "");
  return t ? `@${t}` : "";
};
