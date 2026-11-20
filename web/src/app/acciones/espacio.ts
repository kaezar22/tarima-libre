"use server";
import { revalidatePath } from "next/cache";
import * as auth from "@/lib/auth";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { borrarFoto, listaFotos } from "@/lib/fotos";
import { CIUDADES, GENEROS, TIPOS_BENEFICIO, TIPOS_ESPACIO } from "@/lib/config";
import { arroba, entero, txt, volver } from "./util";

export async function guardarEspacio(fd: FormData) {
  const u = await auth.exigir("espacio");
  const generos = fd.getAll("generos").map(String).filter((g) => GENEROS.includes(g));
  const nombre = txt(fd, "nombre", 120);
  if (nombre.length < 2 || !generos.length) volver("/mi-espacio?tab=datos", { error: "Escribe el nombre y elige al menos un género." });
  const datos = {
    nombre,
    tipo: TIPOS_ESPACIO.includes(txt(fd, "tipo")) ? txt(fd, "tipo") : "Otro",
    capacidad: String(Math.max(1, entero(fd, "capacidad", 100))),
    ciudad: CIUDADES.includes(txt(fd, "ciudad")) ? txt(fd, "ciudad") : "Bogotá",
    barrio: txt(fd, "barrio", 80), direccion: txt(fd, "direccion", 160), generos: generos.join(", "),
    descripcion: txt(fd, "descripcion", 1000), instagram: arroba(txt(fd, "instagram", 80)),
  };
  const e = await m.espacioDeUsuario(u.usuario_id);
  if (e) await db.actualizar("espacios", e.espacio_id, datos);
  else await db.agregar("espacios", { ...datos, usuario_id: u.usuario_id, verificado: "NO", fotos: "" });
  revalidatePath("/", "layout");
  volver("/mi-espacio?tab=datos", { ok: e ? "Datos guardados." : "¡Espacio creado! Ahora sube fotos y publica tus beneficios." });
}

export async function guardarBeneficios(fd: FormData) {
  const u = await auth.exigir("espacio");
  const e = await m.espacioDeUsuario(u.usuario_id);
  if (!e) volver("/mi-espacio?tab=datos", { error: "Primero guarda los datos del espacio." });
  const actuales = await db.filtrar("beneficios", { espacio_id: e.espacio_id }, true);
  const errores: string[] = [];
  for (const [tipo, def] of Object.entries(TIPOS_BENEFICIO)) {
    const activo = fd.get(`on_${tipo}`) === "on";
    const valor = txt(fd, `v_${tipo}`, 20).replace(/[^\d:.apm\s]/gi, "");
    const condicion = txt(fd, `c_${tipo}`, 200);
    if (activo && !valor) errores.push(`Falta el valor de "${def.etiqueta}".`);
    const existente = actuales.find((b) => b.tipo === tipo);
    if (existente) {
      await db.actualizar("beneficios", existente.beneficio_id, { activo: activo && valor ? "SI" : "NO", valor: valor || existente.valor, condicion, para: def.para });
    } else if (activo && valor) {
      await db.agregar("beneficios", { espacio_id: e.espacio_id, para: def.para, tipo, valor, condicion, activo: "SI" });
    }
  }
  revalidatePath("/", "layout");
  volver("/mi-espacio?tab=beneficios", errores.length ? { error: errores.join(" ") } : { ok: "Beneficios guardados." });
}

export async function quitarFoto(fd: FormData) {
  const u = await auth.exigir("espacio");
  const e = await m.espacioDeUsuario(u.usuario_id);
  if (!e) return;
  const url = txt(fd, "url", 600);
  const fotos = listaFotos((await db.obtener("espacios", e.espacio_id, true))?.fotos ?? "");
  const f = fotos.find((x) => x.url === url);
  if (f) await borrarFoto(f);
  await db.actualizar("espacios", e.espacio_id, { fotos: JSON.stringify(fotos.filter((x) => x.url !== url)) });
  revalidatePath("/", "layout");
  volver("/mi-espacio?tab=fotos", { ok: "Foto quitada." });
}
