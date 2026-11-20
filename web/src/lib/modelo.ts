// Reglas del negocio sobre la capa de datos (solo servidor).
import "server-only";
import * as db from "./db";
import { DIAS_PUBLICAR_CALIFICACION, TIPOS_BENEFICIO, type Fila } from "./config";
import { diasEntre, hoy } from "./fechas";

export type { Fila };
export const num = (v: unknown, d = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : d;
};
export const lista = (t: string) => (t || "").split(",").map((s) => s.trim()).filter(Boolean);
export const pesos = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

// ---------------------------------------------------------------------------
// Perfiles
// ---------------------------------------------------------------------------
export async function espacioDeUsuario(usuarioId: string) {
  return (await db.filtrar("espacios", { usuario_id: usuarioId }))[0];
}
export async function promotorDeUsuario(usuarioId: string) {
  return (await db.filtrar("promotores", { usuario_id: usuarioId }))[0];
}

// ---------------------------------------------------------------------------
// Beneficios
// ---------------------------------------------------------------------------
export type Beneficio = Fila & { texto: string };

export function textoBeneficio(b: Fila): string {
  const t = TIPOS_BENEFICIO[b.tipo];
  if (!t) return b.condicion || b.tipo;
  const v = t.unidad === "COP" ? pesos(num(b.valor)) : b.valor;
  return t.corto.replace("{v}", v);
}

export async function beneficiosDe(espacioId: string, soloActivos = true) {
  const todos = (await db.filtrar("beneficios", { espacio_id: espacioId }))
    .filter((b) => !soloActivos || b.activo === "SI")
    .map((b) => ({ ...b, texto: textoBeneficio(b) }) as Beneficio);
  return {
    promotor: todos.filter((b) => b.para === "promotor"),
    publico: todos.filter((b) => b.para === "publico"),
  };
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
export type EventoCompleto = Fila & {
  espacio?: Fila;
  promotores: (Fila & { promotor?: Fila })[];
  artistasLista: string[];
};

async function completarEventos(evs: Fila[]): Promise<EventoCompleto[]> {
  const snap = await db.snapshot();
  const espacios = new Map(snap.espacios.map((e) => [e.espacio_id, e]));
  const proms = new Map(snap.promotores.map((p) => [p.promotor_id, p]));
  return evs.map((e) => ({
    ...(e as object),
    espacio: espacios.get(e.espacio_id),
    promotores: snap.evento_promotores
      .filter((ep) => ep.evento_id === e.evento_id)
      .sort((a, b) => (a.rol === "principal" ? -1 : b.rol === "principal" ? 1 : 0))
      .map((ep) => ({ ...ep, promotor: proms.get(ep.promotor_id) }) as Fila),
    artistasLista: lista(e.artistas),
  }) as EventoCompleto);
}

const porFechaDesc = (a: Fila, b: Fila) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora);

export async function evento(id: string) {
  const e = await db.obtener("eventos", id);
  return e ? (await completarEventos([e]))[0] : undefined;
}

export async function eventosDeEspacio(espacioId: string, estados?: string[]) {
  const evs = (await db.filtrar("eventos", { espacio_id: espacioId }))
    .filter((e) => !estados || estados.includes(e.estado)).sort(porFechaDesc);
  return completarEventos(evs);
}

export async function eventosDePromotor(promotorId: string, estados?: string[]) {
  const ids = new Set((await db.filtrar("evento_promotores", { promotor_id: promotorId })).map((ep) => ep.evento_id));
  const evs = (await db.leer("eventos"))
    .filter((e) => ids.has(e.evento_id) && (!estados || estados.includes(e.estado))).sort(porFechaDesc);
  return completarEventos(evs);
}

/** Lo único que ve el público: nombre y asistentes de eventos realizados. */
export async function historialPublico(limite = 12) {
  return (await db.leer("eventos"))
    .filter((e) => e.estado === "REALIZADA").sort(porFechaDesc).slice(0, limite)
    .map((e) => ({ evento_id: e.evento_id, nombre: e.nombre, asistentes: num(e.asistentes_reales), demo: e.demo === "SI" }));
}

/** ¿Puede este usuario ver el detalle completo del evento? */
export async function puedeVerDetalle(u: Fila | null, e: EventoCompleto) {
  if (!u) return false;
  if (u.rol === "admin") return true;
  if (e.estado === "REALIZADA") return true; // promotores y espacios ven el historial completo
  if (u.rol === "espacio") return e.espacio?.usuario_id === u.usuario_id;
  const p = await promotorDeUsuario(u.usuario_id);
  return !!p && e.promotores.some((ep) => ep.promotor_id === p.promotor_id);
}

export async function crearPropuesta(d: {
  espacioId: string; promotorId: string; nombre: string; fecha: string; hora: string;
  genero: string; artistas: string; mensaje: string; prometidos: number;
  copromotores: { promotorId: string; prometidos: number }[];
}) {
  const total = d.prometidos + d.copromotores.reduce((s, c) => s + c.prometidos, 0);
  const ev = await db.agregar("eventos", {
    espacio_id: d.espacioId, nombre: d.nombre, fecha: d.fecha, hora: d.hora, genero: d.genero,
    artistas: d.artistas, mensaje: d.mensaje, estado: "PENDIENTE",
    asistentes_esperados: String(total), creado_por: d.promotorId,
  });
  await db.agregarVarias("evento_promotores", [
    { evento_id: ev.evento_id, promotor_id: d.promotorId, rol: "principal", asistentes_prometidos: String(d.prometidos) },
    ...d.copromotores.map((c) => ({
      evento_id: ev.evento_id, promotor_id: c.promotorId, rol: "copromotor", asistentes_prometidos: String(c.prometidos),
    })),
  ]);
  return ev;
}

/** Asistentes por promotor contados con QR Eventos (check-ins). */
export async function checkinsPorPromotor(eventoId: string): Promise<Record<string, number>> {
  const r: Record<string, number> = {};
  for (const reg of await db.filtrar("registros", { evento_id: eventoId }, true)) {
    if (reg.checkin === "SI") r[reg.promotor_id] = (r[reg.promotor_id] ?? 0) + 1;
  }
  return r;
}

/** Marca el evento como realizado. Usa los check-ins de QR; si un promotor no
 * tiene check-ins, toma el número que escribió el espacio. */
export async function marcarRealizado(eventoId: string, manual: Record<string, number>) {
  const qr = await checkinsPorPromotor(eventoId);
  const eps = await db.filtrar("evento_promotores", { evento_id: eventoId }, true);
  let total = 0;
  for (const ep of eps) {
    const n = qr[ep.promotor_id] ?? manual[ep.promotor_id] ?? 0;
    total += n;
    await db.actualizar("evento_promotores", ep.ep_id, { asistentes_reales: String(n) });
  }
  await db.actualizar("eventos", eventoId, { estado: "REALIZADA", asistentes_reales: String(total) });
}

// ---------------------------------------------------------------------------
// Calificaciones y reputación
// ---------------------------------------------------------------------------
export async function calificacionesPublicas(aTipo: "espacio" | "promotor", aId: string) {
  const snap = await db.snapshot();
  const porEvento = new Map<string, Set<string>>();
  for (const c of snap.calificaciones) {
    if (!porEvento.has(c.evento_id)) porEvento.set(c.evento_id, new Set());
    porEvento.get(c.evento_id)!.add(c.de_tipo);
  }
  const eventos = new Map(snap.eventos.map((e) => [e.evento_id, e]));
  const h = hoy();
  return snap.calificaciones
    .filter((c) => c.a_tipo === aTipo && c.a_id === aId)
    .filter((c) => {
      const e = eventos.get(c.evento_id);
      const ambos = (porEvento.get(c.evento_id)?.size ?? 0) >= 2;
      return ambos || (e && diasEntre(e.fecha, h) >= DIAS_PUBLICAR_CALIFICACION);
    })
    .map((c) => ({ ...c, evento: eventos.get(c.evento_id) }) as Fila)
    .sort((a, b) => (a.evento?.fecha ?? "").localeCompare(b.evento?.fecha ?? ""));
}

export type Reputacion = Awaited<ReturnType<typeof reputacion>>;

export async function reputacion(aTipo: "espacio" | "promotor", aId: string) {
  const cals = await calificacionesPublicas(aTipo, aId);
  const prom = (k: string) => {
    const v = cals.map((c) => num(c[k])).filter(Boolean);
    return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null;
  };
  const promedios = {
    general: prom("general"), cumplimiento: prom("cumplimiento"),
    comunicacion: prom("comunicacion"), calidad: prom("calidad"),
  };
  const snap = await db.snapshot();
  let realizados: Fila[], cancelados = 0, aceptados = 0, asistentes = 0;
  const ratios: { mes: string; fecha: string; nombre: string; prometidos: number; reales: number }[] = [];
  if (aTipo === "espacio") {
    const evs = snap.eventos.filter((e) => e.espacio_id === aId);
    realizados = evs.filter((e) => e.estado === "REALIZADA");
    cancelados = evs.filter((e) => e.estado === "CANCELADA").length;
    aceptados = realizados.length + cancelados + evs.filter((e) => e.estado === "ACEPTADA").length;
    asistentes = realizados.reduce((s, e) => s + num(e.asistentes_reales), 0);
    for (const e of realizados) ratios.push({ mes: e.fecha.slice(0, 7), fecha: e.fecha, nombre: e.nombre, prometidos: num(e.asistentes_esperados), reales: num(e.asistentes_reales) });
  } else {
    const eps = snap.evento_promotores.filter((ep) => ep.promotor_id === aId);
    const evs = new Map(snap.eventos.map((e) => [e.evento_id, e]));
    realizados = [];
    for (const ep of eps) {
      const e = evs.get(ep.evento_id);
      if (!e) continue;
      if (e.estado === "REALIZADA") {
        realizados.push(e);
        asistentes += num(ep.asistentes_reales);
        ratios.push({ mes: e.fecha.slice(0, 7), fecha: e.fecha, nombre: e.nombre, prometidos: num(ep.asistentes_prometidos), reales: num(ep.asistentes_reales) });
      }
      if (e.estado === "CANCELADA") cancelados++;
      if (["REALIZADA", "CANCELADA", "ACEPTADA"].includes(e.estado)) aceptados++;
    }
  }
  ratios.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const conPromesa = ratios.filter((r) => r.prometidos > 0);
  return {
    n: cals.length,
    promedios,
    calificaciones: cals,
    eventosRealizados: realizados.length,
    eventosCancelados: cancelados,
    tasaCumplimiento: aceptados ? realizados.length / aceptados : null,
    asistentesTotales: asistentes,
    asistenciaVsPrometida: conPromesa.length
      ? conPromesa.reduce((s, r) => s + r.reales / r.prometidos, 0) / conPromesa.length : null,
    serie: ratios,
  };
}

export async function yaCalifico(eventoId: string, deTipo: string, deId: string, aId: string) {
  return (await db.filtrar("calificaciones", { evento_id: eventoId, de_tipo: deTipo, de_id: deId, a_id: aId }, true)).length > 0;
}

// ---------------------------------------------------------------------------
// Búsqueda de espacios
// ---------------------------------------------------------------------------
export async function buscarEspacios(f: {
  ciudad?: string; genero?: string; tipo?: string; capMin?: number; capMax?: number;
  texto?: string; beneficio?: string; soloVerificados?: boolean;
}) {
  const snap = await db.snapshot();
  const texto = (f.texto || "").toLowerCase().trim();
  const res: (Fila & { beneficios: { promotor: string[]; publico: string[] }; rep: Reputacion })[] = [];
  for (const e of snap.espacios) {
    if (f.soloVerificados !== false && e.verificado !== "SI") continue;
    if (f.ciudad && e.ciudad !== f.ciudad) continue;
    if (f.tipo && e.tipo !== f.tipo) continue;
    const cap = num(e.capacidad);
    if (f.capMin && cap < f.capMin) continue;
    if (f.capMax && cap > f.capMax) continue;
    if (f.genero && !lista(e.generos).includes(f.genero)) continue;
    const bs = snap.beneficios.filter((b) => b.espacio_id === e.espacio_id && b.activo === "SI");
    if (f.beneficio && !bs.some((b) => b.tipo === f.beneficio)) continue;
    if (texto && !`${e.nombre} ${e.barrio} ${e.generos} ${e.descripcion}`.toLowerCase().includes(texto)) continue;
    res.push({
      ...(e as object),
      beneficios: {
        promotor: bs.filter((b) => b.para === "promotor").map(textoBeneficio),
        publico: bs.filter((b) => b.para === "publico").map(textoBeneficio),
      },
      rep: await reputacion("espacio", e.espacio_id),
    } as Fila & { beneficios: { promotor: string[]; publico: string[] }; rep: Reputacion });
  }
  return res.sort((a, b) => (b.rep.promedios.general ?? 0) - (a.rep.promedios.general ?? 0));
}

export async function ultimoPerfilIg(usuarioId: string) {
  const ps = await db.filtrar("perfiles_ig", { usuario_id: usuarioId });
  return ps[ps.length - 1];
}
