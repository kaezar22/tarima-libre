"use server";
import { revalidatePath } from "next/cache";
import * as auth from "@/lib/auth";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { analizarTexto, MODELO } from "@/lib/deepseek";
import { GENEROS, CIUDADES } from "@/lib/config";
import { arroba, txt, volver } from "./util";

export async function guardarPromotor(fd: FormData) {
  const u = await auth.exigir("promotor");
  const generos = fd.getAll("generos").map(String).filter((g) => GENEROS.includes(g));
  const nombre = txt(fd, "nombre", 120);
  if (nombre.length < 2 || !generos.length) volver("/perfil", { error: "Escribe tu nombre y elige al menos un género." });
  const ciudad = CIUDADES.includes(txt(fd, "ciudad")) ? txt(fd, "ciudad") : "Bogotá";
  const tipo = ["promotor", "artista", "ambos"].includes(txt(fd, "tipo")) ? txt(fd, "tipo") : "promotor";
  const datos = { nombre, tipo, ciudad, generos: generos.join(", "), descripcion: txt(fd, "descripcion", 800), instagram: arroba(txt(fd, "instagram", 80)) };
  const p = await m.promotorDeUsuario(u.usuario_id);
  if (p) await db.actualizar("promotores", p.promotor_id, datos);
  else await db.agregar("promotores", { ...datos, usuario_id: u.usuario_id });
  revalidatePath("/", "layout");
  volver("/perfil", { ok: "Perfil guardado." });
}

export async function guardarDatos(fd: FormData) {
  const u = await auth.exigir();
  await db.actualizar("usuarios", u.usuario_id, { nombre: txt(fd, "nombre", 120) || u.nombre, celular: txt(fd, "celular", 30) });
  revalidatePath("/", "layout");
  volver("/perfil?tab=cuenta", { ok: "Datos guardados." });
}

export async function cambiarPin(fd: FormData) {
  const u = await auth.exigir();
  const { estado } = await auth.verificar(u.email, txt(fd, "actual", 10));
  if (estado !== "OK") volver("/perfil?tab=cuenta", { error: estado === "BLOQUEADO" ? "Demasiados intentos: cuenta bloqueada temporalmente." : "El PIN actual no es correcto." });
  const e = auth.validarPinNuevo(txt(fd, "nuevo", 10), txt(fd, "nuevo2", 10));
  if (e) volver("/perfil?tab=cuenta", { error: e });
  await auth.cambiarPin(u.usuario_id, txt(fd, "nuevo", 10));
  volver("/perfil?tab=cuenta", { ok: "PIN actualizado." });
}

export async function analizarInstagram(fd: FormData) {
  const u = await auth.exigir();
  const destino = u.rol === "espacio" ? "/mi-espacio?tab=instagram" : "/perfil?tab=instagram";
  if (fd.get("autorizo") !== "on") volver(destino, { error: "Necesitamos tu autorización para analizar el texto." });
  const texto = txt(fd, "texto", 12000);
  let res;
  try {
    res = await analizarTexto(texto, u.rol);
  } catch (e) {
    volver(destino, { error: e instanceof Error ? e.message : "El análisis falló." });
  }
  await db.agregar("perfiles_ig", {
    usuario_id: u.usuario_id, instagram: arroba(txt(fd, "cuenta", 80)), fuente: "manual",
    generos: res.generos.join(", "), tipo_contenido: res.tipo_contenido, publico: res.publico, tono: res.tono,
    etiquetas: res.etiquetas.join(", "), resumen: res.resumen,
    publicaciones_analizadas: String(texto.split("\n").filter((l) => l.trim()).length), modelo: MODELO,
  });
  revalidatePath("/", "layout");
  volver(destino, { ok: "¡Análisis listo! Ya aparece en tu perfil." });
}
