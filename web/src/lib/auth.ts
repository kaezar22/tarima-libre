// Login con correo + PIN y sesión en cookie firmada (solo servidor).
// El hash es compatible con el beta en Streamlit (PBKDF2-SHA256, 200.000 iteraciones).
import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as db from "./db";
import { PIN_BLOQUEO_MINUTOS, PIN_LARGO, PIN_MAX_INTENTOS, type Fila, type Rol } from "./config";
import { ahora } from "./fechas";

const ITER = 200_000;
const COOKIE = "tl_sesion";
const DURACION_DIAS = 30;

export function hashPin(pin: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const h = crypto.pbkdf2Sync(pin, Buffer.from(s, "hex"), ITER, 32, "sha256").toString("hex");
  return { hash: h, salt: s };
}

export const pinValido = (pin: string) => new RegExp(`^\\d{${PIN_LARGO}}$`).test(pin || "");
export function pinDebil(pin: string) {
  if (new Set(pin).size === 1) return true;
  const sec = "01234567890";
  return sec.includes(pin) || sec.split("").reverse().join("").includes(pin);
}
export const emailValido = (e: string) => /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test((e || "").trim());

export function validarPinNuevo(pin: string, pin2: string): string | null {
  if (!pinValido(pin)) return `El PIN debe tener exactamente ${PIN_LARGO} dígitos.`;
  if (pinDebil(pin)) return "Ese PIN es muy fácil de adivinar. Evita 123456, 000000 y similares.";
  if (pin !== pin2) return "Los dos PIN no coinciden.";
  return null;
}

export async function buscarPorEmail(email: string, fresco = true) {
  const e = (email || "").trim().toLowerCase();
  return (await db.leer("usuarios", fresco)).find((u) => u.email.trim().toLowerCase() === e);
}

export async function crearUsuario(d: {
  rol: Rol; nombre: string; email: string; pin: string; celular?: string;
  estado?: string; demo?: boolean; acepta_politica?: string; version_politica?: string;
}) {
  const { hash, salt } = hashPin(d.pin);
  return db.agregar("usuarios", {
    rol: d.rol, nombre: d.nombre.trim(), email: d.email.trim().toLowerCase(),
    celular: d.celular ?? "", pin_hash: hash, pin_salt: salt, intentos_fallidos: "0",
    estado: d.estado ?? "ACTIVO", acepta_politica: d.acepta_politica ?? "",
    version_politica: d.version_politica ?? "", demo: d.demo ? "SI" : "",
  });
}

export async function cambiarPin(usuarioId: string, pin: string) {
  const { hash, salt } = hashPin(pin);
  await db.actualizar("usuarios", usuarioId, { pin_hash: hash, pin_salt: salt, intentos_fallidos: "0", bloqueado_hasta: "" });
}

export type ResultadoIngreso = "OK" | "NO_EXISTE" | "PIN_INCORRECTO" | "BLOQUEADO" | "PENDIENTE" | "INACTIVO";

export async function verificar(email: string, pin: string): Promise<{ estado: ResultadoIngreso; u?: Fila }> {
  const u = await buscarPorEmail(email);
  if (!u) {
    hashPin(pin || "0"); // mismo tiempo de respuesta
    return { estado: "NO_EXISTE" };
  }
  if (u.bloqueado_hasta && u.bloqueado_hasta > ahora()) return { estado: "BLOQUEADO", u };

  const { hash } = hashPin(pin || "", u.pin_salt);
  const ok = u.pin_hash.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(u.pin_hash));
  if (!ok) {
    const intentos = Number(u.intentos_fallidos || 0) + 1;
    if (intentos >= PIN_MAX_INTENTOS) {
      const hasta = ahora(new Date(Date.now() + PIN_BLOQUEO_MINUTOS * 60_000));
      await db.actualizar("usuarios", u.usuario_id, { intentos_fallidos: "0", bloqueado_hasta: hasta });
      return { estado: "BLOQUEADO", u };
    }
    await db.actualizar("usuarios", u.usuario_id, { intentos_fallidos: String(intentos) });
    return { estado: "PIN_INCORRECTO", u };
  }
  if (u.estado === "PENDIENTE") return { estado: "PENDIENTE", u };
  if (u.estado !== "ACTIVO") return { estado: "INACTIVO", u };
  await db.actualizar("usuarios", u.usuario_id, { intentos_fallidos: "0", bloqueado_hasta: "", ultimo_ingreso: ahora() });
  return { estado: "OK", u };
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------
function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Falta SESSION_SECRET (mínimo 16 caracteres)");
  return "solo-desarrollo-local-no-usar-en-produccion";
}

const firmar = (datos: string) => crypto.createHmac("sha256", secreto()).update(datos).digest("base64url");

export async function iniciarSesion(usuarioId: string) {
  const exp = Date.now() + DURACION_DIAS * 86400_000;
  const datos = `${usuarioId}.${exp}`;
  (await cookies()).set(COOKIE, `${datos}.${firmar(datos)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: DURACION_DIAS * 86400,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

export async function usuarioActual(): Promise<Fila | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [id, exp, firma] = v.split(".");
  if (!id || !exp || !firma) return null;
  const esperada = firmar(`${id}.${exp}`);
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  if (Number(exp) < Date.now()) return null;
  const u = await db.obtener("usuarios", id);
  return u && u.estado === "ACTIVO" ? u : null;
}

/** Para páginas que exigen sesión (y opcionalmente un rol). */
export async function exigir(...roles: Rol[]): Promise<Fila> {
  const u = await usuarioActual();
  if (!u) redirect("/ingresar");
  if (roles.length && !roles.includes(u.rol as Rol)) redirect("/");
  return u;
}
