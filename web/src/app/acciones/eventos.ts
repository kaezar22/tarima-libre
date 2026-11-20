"use server";
import { revalidatePath } from "next/cache";
import * as auth from "@/lib/auth";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { GENEROS, type Fila } from "@/lib/config";
import { hoy } from "@/lib/fechas";
import { entero, txt, volver } from "./util";

async function cargar(eventoId: string, u: Fila) {
  const e = await m.evento(eventoId);
  if (!e) volver("/eventos", { error: "El evento no existe." });
  const esEspacio = u.rol === "espacio" && e.espacio?.usuario_id === u.usuario_id;
  const prom = u.rol === "promotor" ? await m.promotorDeUsuario(u.usuario_id) : undefined;
  const ep = prom ? e.promotores.find((p) => p.promotor_id === prom.promotor_id) : undefined;
  return { e, esEspacio, prom, ep, esAdmin: u.rol === "admin" };
}

export async function proponer(fd: FormData) {
  const u = await auth.exigir("promotor");
  const prom = await m.promotorDeUsuario(u.usuario_id);
  const espacioId = txt(fd, "espacio_id", 40);
  const volverA = `/eventos/nuevo?espacio=${espacioId}`;
  if (!prom) volver("/perfil", { error: "Completa tu perfil de promotor antes de proponer eventos." });
  const espacio = await db.obtener("espacios", espacioId);
  if (!espacio || espacio.verificado !== "SI") volver("/espacios", { error: "Ese espacio no está disponible." });
  const nombre = txt(fd, "nombre", 120), fecha = txt(fd, "fecha", 10);
  if (nombre.length < 3) volver(volverA, { error: "Ponle un nombre al evento." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoy()) volver(volverA, { error: "Elige una fecha de hoy en adelante." });
  const copromotores = fd.getAll("copromotor").map(String).filter((id) => id && id !== prom.promotor_id)
    .map((id) => ({ promotorId: id, prometidos: Math.max(0, entero(fd, `prometidos_${id}`, 0)) }));
  const ev = await m.crearPropuesta({
    espacioId, promotorId: prom.promotor_id, nombre, fecha, hora: txt(fd, "hora", 20),
    genero: GENEROS.includes(txt(fd, "genero")) ? txt(fd, "genero") : "Otro",
    artistas: txt(fd, "artistas", 300), mensaje: txt(fd, "mensaje", 1000),
    prometidos: Math.max(1, entero(fd, "prometidos", 50)), copromotores,
  });
  revalidatePath("/", "layout");
  volver(`/eventos/${ev.evento_id}`, { ok: "Propuesta enviada. Te avisaremos cuando el espacio responda." });
}

export async function responder(fd: FormData) {
  const u = await auth.exigir("espacio", "admin");
  const { e, esEspacio, esAdmin } = await cargar(txt(fd, "evento_id", 40), u);
  if (!(esEspacio || esAdmin) || e.estado !== "PENDIENTE") volver(`/eventos/${e.evento_id}`, { error: "No puedes responder esta propuesta." });
  const acepta = txt(fd, "decision") === "aceptar";
  await db.actualizar("eventos", e.evento_id, { estado: acepta ? "ACEPTADA" : "RECHAZADA", respuesta: txt(fd, "respuesta", 500) });
  revalidatePath("/", "layout");
  volver(`/eventos/${e.evento_id}`, { ok: acepta ? "Evento confirmado." : "Propuesta rechazada." });
}

export async function cancelar(fd: FormData) {
  const u = await auth.exigir();
  const { e, esEspacio, ep, esAdmin } = await cargar(txt(fd, "evento_id", 40), u);
  const puede = esAdmin || esEspacio || ep?.rol === "principal";
  if (!puede || !["PENDIENTE", "ACEPTADA"].includes(e.estado)) volver(`/eventos/${e.evento_id}`, { error: "No puedes cancelar este evento." });
  await db.actualizar("eventos", e.evento_id, { estado: "CANCELADA", respuesta: e.respuesta || `Cancelado por ${u.nombre}` });
  revalidatePath("/", "layout");
  volver(`/eventos/${e.evento_id}`, { ok: "Evento cancelado." });
}

export async function realizar(fd: FormData) {
  const u = await auth.exigir("espacio", "admin");
  const { e, esEspacio, esAdmin } = await cargar(txt(fd, "evento_id", 40), u);
  if (!(esEspacio || esAdmin) || e.estado !== "ACEPTADA") volver(`/eventos/${e.evento_id}`, { error: "No puedes cerrar este evento." });
  if (e.fecha > hoy()) volver(`/eventos/${e.evento_id}`, { error: "Podrás marcarlo como realizado desde el día del evento." });
  const manual: Record<string, number> = {};
  for (const ep of e.promotores) manual[ep.promotor_id] = Math.max(0, entero(fd, `reales_${ep.promotor_id}`, 0));
  await m.marcarRealizado(e.evento_id, manual);
  revalidatePath("/", "layout");
  volver(`/eventos/${e.evento_id}`, { ok: "Evento cerrado. Ya pueden calificarse." });
}

export async function calificar(fd: FormData) {
  const u = await auth.exigir("espacio", "promotor");
  const { e, esEspacio, prom, ep } = await cargar(txt(fd, "evento_id", 40), u);
  const aId = txt(fd, "a_id", 40);
  if (e.estado !== "REALIZADA") volver(`/eventos/${e.evento_id}`, { error: "Solo se califican eventos realizados." });
  let deTipo: string, deId: string, aTipo: string;
  if (esEspacio && e.promotores.some((p) => p.promotor_id === aId)) {
    deTipo = "espacio"; deId = e.espacio_id; aTipo = "promotor";
  } else if (prom && ep && aId === e.espacio_id) {
    deTipo = "promotor"; deId = prom.promotor_id; aTipo = "espacio";
  } else {
    volver(`/eventos/${e.evento_id}`, { error: "No puedes calificar en este evento." });
  }
  if (await m.yaCalifico(e.evento_id, deTipo, deId, aId)) volver(`/eventos/${e.evento_id}`, { error: "Ya calificaste." });
  const p = (k: string) => String(Math.min(5, Math.max(1, entero(fd, k, 4))));
  await db.agregar("calificaciones", {
    evento_id: e.evento_id, de_tipo: deTipo, de_id: deId, a_tipo: aTipo, a_id: aId,
    general: p("general"), cumplimiento: p("cumplimiento"), comunicacion: p("comunicacion"), calidad: p("calidad"),
    observaciones: txt(fd, "observaciones", 600),
  });
  revalidatePath("/", "layout");
  volver(`/eventos/${e.evento_id}`, { ok: "¡Gracias por calificar!" });
}
