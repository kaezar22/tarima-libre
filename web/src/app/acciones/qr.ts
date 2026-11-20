"use server";
import { revalidatePath } from "next/cache";
import * as auth from "@/lib/auth";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { codigoCorto, qrPng } from "@/lib/qr";
import { enviarQr } from "@/lib/correo";
import { POLITICA_VERSION, QR_PREFIJO } from "@/lib/config";
import { fechaLarga } from "@/lib/fechas";
import { txt, volver } from "./util";

export async function crearInvitacion(fd: FormData) {
  const u = await auth.exigir("promotor");
  const prom = await m.promotorDeUsuario(u.usuario_id);
  if (!prom) volver("/perfil", { error: "Completa tu perfil de promotor primero." });
  const e = await m.evento(txt(fd, "evento_id", 40));
  if (!e || e.estado !== "ACEPTADA" || !e.promotores.some((p) => p.promotor_id === prom.promotor_id)) {
    volver("/qr", { error: "Solo puedes crear invitaciones para tus eventos confirmados." });
  }
  const existente = (await db.filtrar("invitaciones", { evento_id: e.evento_id, promotor_id: prom.promotor_id }, true))[0];
  if (existente) volver(`/qr?inv=${existente.codigo}`);
  const bs = await m.beneficiosDe(e.espacio_id);
  let codigo = codigoCorto();
  while (await db.obtener("invitaciones", codigo, true)) codigo = codigoCorto();
  await db.agregar("invitaciones", {
    codigo, evento_id: e.evento_id, promotor_id: prom.promotor_id,
    nombre_artista: txt(fd, "nombre_artista", 120) || prom.nombre,
    beneficio: bs.publico.map((b) => b.texto).join(" · "), activa: "SI",
  });
  revalidatePath("/qr");
  volver(`/qr?inv=${codigo}`, { ok: "Invitación creada. Compártela con tus seguidores." });
}

export async function registrarSeguidor(fd: FormData) {
  const codigo = txt(fd, "codigo", 12).toUpperCase();
  const inv = await db.obtener("invitaciones", codigo);
  const base = `/qr/${codigo}`;
  if (!inv || inv.activa !== "SI") volver(base, { error: "Esta invitación no existe o ya no está activa." });
  const e = await m.evento(inv.evento_id);
  if (!e || !["ACEPTADA", "PENDIENTE"].includes(e.estado)) volver(base, { error: "El registro para este evento ya cerró." });
  const nombre = txt(fd, "nombre", 120), email = txt(fd, "email", 200).toLowerCase(), celular = txt(fd, "celular", 30);
  const q = `${base}?nombre=${encodeURIComponent(nombre)}&email=${encodeURIComponent(email)}&celular=${encodeURIComponent(celular)}`;
  if (nombre.length < 2) volver(q, { error: "Escribe tu nombre." });
  if (!auth.emailValido(email)) volver(q, { error: "Revisa tu correo." });
  if (celular.replace(/\D/g, "").length < 7) volver(q, { error: "Revisa tu celular." });
  if (fd.get("acepta") !== "on") volver(q, { error: "Debes aceptar la política de datos para registrarte." });
  const previo = (await db.filtrar("registros", { evento_id: e.evento_id }, true)).find((r) => r.email === email);
  if (previo) volver(`${base}/listo?r=${previo.registro_id}`, { ok: "Ya estabas registrado: este es tu QR." });

  const reg = await db.agregar("registros", {
    codigo, evento_id: e.evento_id, promotor_id: inv.promotor_id, nombre, email, celular,
    acepta_politica: "SI", version_politica: POLITICA_VERSION,
  });
  const enviado = await enviarQr({
    para: email, nombre, evento: e.nombre, fecha: `${fechaLarga(e.fecha)} ${e.hora}`.trim(),
    lugar: e.espacio ? `${e.espacio.nombre}, ${e.espacio.barrio}` : "", beneficio: inv.beneficio,
    png: await qrPng(QR_PREFIJO + reg.registro_id), codigo: reg.registro_id.toUpperCase(),
  });
  await db.actualizar("registros", reg.registro_id, { email_enviado: enviado });
  volver(`${base}/listo?r=${reg.registro_id}`);
}
