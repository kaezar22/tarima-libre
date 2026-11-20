import Image from "next/image";
import Link from "next/link";
import { listaFotos, sinOptimizar } from "@/lib/fotos";
import { notFound } from "next/navigation";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { usuarioActual } from "@/lib/auth";
import { DIMENSIONES, ESTADOS_EVENTO, type Fila } from "@/lib/config";
import { fechaCorta, fechaLarga, hoy } from "@/lib/fechas";
import { calificar, cancelar, realizar, responder } from "../../acciones/eventos";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Demo } from "@/components/Demo";
import { Mensajes, type SP } from "@/components/Mensajes";
import { IcoQr, IcoVolver } from "@/components/Iconos";

export const dynamic = "force-dynamic";

export default async function DetalleEvento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [e, u] = await Promise.all([m.evento(id), usuarioActual()]);
  if (!e) notFound();
  const completo = await m.puedeVerDetalle(u, e);

  // Público: solo nombre y asistentes de eventos realizados
  if (!completo) {
    if (e.estado !== "REALIZADA") notFound();
    return (
      <section className="flex flex-col gap-3 px-4 pt-8">
        <Demo si={e.demo} className="self-start" />
        <h1 className="titulo m-0 text-4xl">{e.nombre}</h1>
        <p className="m-0"><b className="titulo text-5xl text-naranja-osc">{e.asistentes_reales}</b> asistentes verificados</p>
        <p className="m-0 text-gris"><Link href="/ingresar">Ingresa</Link> para ver el detalle completo del evento.</p>
      </section>
    );
  }

  const esEspacio = u?.rol === "espacio" && e.espacio?.usuario_id === u.usuario_id;
  const esAdmin = u?.rol === "admin";
  const yo = u?.rol === "promotor" ? await m.promotorDeUsuario(u.usuario_id) : undefined;
  const miEp = yo ? e.promotores.find((p) => p.promotor_id === yo.promotor_id) : undefined;
  const realizado = e.estado === "REALIZADA";
  const portada = listaFotos(e.espacio?.fotos ?? "")[0]?.url;
  const [bs, cals, qr] = await Promise.all([
    m.beneficiosDe(e.espacio_id),
    db.filtrar("calificaciones", { evento_id: e.evento_id }),
    e.estado === "ACEPTADA" ? m.checkinsPorPromotor(e.evento_id) : Promise.resolve({} as Record<string, number>),
  ]);
  const totalReal = m.num(e.asistentes_reales), totalEsp = m.num(e.asistentes_esperados);
  const pct = totalEsp ? Math.round((totalReal / totalEsp) * 100) : 0;
  const ambos = new Set(cals.map((c) => c.de_tipo)).size >= 2;
  const pubCals = cals.filter(() => ambos || (realizado && (Date.parse(hoy()) - Date.parse(e.fecha)) / 86400000 >= 14));
  const nombreDe = (c: Fila) => c.de_tipo === "espacio" ? e.espacio?.nombre : e.promotores.find((p) => p.promotor_id === c.de_id)?.promotor?.nombre;
  const nombreA = (c: Fila) => c.a_tipo === "espacio" ? e.espacio?.nombre : e.promotores.find((p) => p.promotor_id === c.a_id)?.promotor?.nombre;

  // Qué puede calificar el usuario
  const porCalificar: { aId: string; aTipo: "espacio" | "promotor"; nombre: string }[] = [];
  if (realizado && esEspacio) {
    for (const p of e.promotores) if (!cals.some((c) => c.de_tipo === "espacio" && c.a_id === p.promotor_id)) porCalificar.push({ aId: p.promotor_id, aTipo: "promotor", nombre: p.promotor?.nombre ?? "" });
  }
  if (realizado && miEp && !cals.some((c) => c.de_tipo === "promotor" && c.de_id === miEp.promotor_id)) {
    porCalificar.push({ aId: e.espacio_id, aTipo: "espacio", nombre: e.espacio?.nombre ?? "" });
  }
  const maxProm = Math.max(...e.promotores.map((p) => Math.max(m.num(p.asistentes_reales), m.num(p.asistentes_prometidos))), 1);

  return (
    <>
      <Mensajes sp={sp} />
      <header className="flex items-center gap-2 px-2 pt-3">
        <Link href="/eventos" aria-label="Volver a eventos" className="flex h-11 w-11 items-center justify-center text-tinta"><IcoVolver /></Link>
        <span className="font-semibold">{ESTADOS_EVENTO[e.estado]}</span>
        <Demo si={e.demo} className="ml-auto mr-3" />
      </header>

      {portada && (
        <div className="px-4 pb-3">
          <Image src={portada} alt={`${e.espacio?.nombre}`} width={1200} height={600} className="h-40 w-full rounded-2xl object-cover" unoptimized={sinOptimizar(portada)} />
        </div>
      )}
      <section className="flex flex-col gap-1.5 px-4 pt-1">
        <span className="text-sm text-gris">{fechaLarga(e.fecha)}{e.hora && ` · ${e.hora}`} · {e.genero}</span>
        <h1 className="titulo m-0 text-4xl">{e.nombre}</h1>
        {e.espacio && <Link href={`/espacios/${e.espacio_id}`} className="font-semibold text-naranja-osc">en {e.espacio.nombre} · {e.espacio.barrio}</Link>}
      </section>

      {realizado && (
        <section className="px-4 pt-4">
          <div className="tarjeta flex flex-col gap-2 p-4">
            <div className="flex items-end gap-3">
              <span className="titulo text-[64px] leading-[.85] text-naranja-osc">{totalReal}</span>
              <span className="pb-1 text-sm text-concreto">asistentes verificados<br />de {totalEsp} esperados</span>
              <span className={`ml-auto rounded-full px-3 py-1 text-sm font-bold ${pct >= 100 ? "bg-[#E3F2E7] text-ok" : "bg-gris-suave text-concreto"}`}>{pct}%</span>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 px-4 pt-6">
        <h2 className="titulo m-0 text-2xl">Promotores</h2>
        <div className="tarjeta flex flex-col gap-4 p-4">
          {e.promotores.map((p) => (
            <div key={p.ep_id} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2 text-[15px]">
                <Link href={`/promotores/${p.promotor_id}`} className="font-semibold text-tinta">{p.promotor?.nombre}{p.rol === "copromotor" && <span className="font-normal text-gris"> · copromotor</span>}</Link>
                <span>{realizado ? <><b>{p.asistentes_reales || 0}</b> <span className="text-gris">/ {p.asistentes_prometidos}</span></> : <span className="text-gris">promete {p.asistentes_prometidos}</span>}</span>
              </div>
              {realizado && <div className="h-2.5 overflow-hidden rounded bg-gris-suave"><div className="h-full rounded bg-naranja" style={{ width: `${(m.num(p.asistentes_reales) / maxProm) * 100}%` }} /></div>}
            </div>
          ))}
          {realizado && <span className="flex items-center gap-1.5 text-xs text-gris"><IcoQr size={14} />Asistentes reales / prometidos por promotor</span>}
        </div>
      </section>

      {e.artistasLista.length > 0 && (
        <section className="flex flex-col gap-2 px-4 pt-6">
          <h2 className="titulo m-0 text-2xl">Artistas</h2>
          <div className="flex flex-wrap gap-2">{e.artistasLista.map((a) => <span key={a} className="rounded-full bg-papel px-4 py-2 text-[15px] ring-1 ring-linea">{a}</span>)}</div>
        </section>
      )}

      <section className="flex flex-col gap-2 px-4 pt-6">
        <h2 className="titulo m-0 text-2xl">Beneficios del espacio</h2>
        <div className="tarjeta flex flex-col gap-2 p-4 text-[15px]">
          {bs.promotor.map((b) => (
            <div key={b.beneficio_id} className="flex justify-between gap-3"><span className="text-concreto">Para promotores</span><b className="text-right">{b.texto}{b.tipo === "pago_por_asistente" && realizado && ` → ${m.pesos(m.num(b.valor) * totalReal)}`}</b></div>
          ))}
          {bs.publico.map((b) => <div key={b.beneficio_id} className="flex justify-between gap-3"><span className="text-concreto">Para el público</span><b className="text-right">{b.texto}</b></div>)}
          {!bs.promotor.length && !bs.publico.length && <span className="text-gris">El espacio no publica beneficios.</span>}
        </div>
      </section>

      {(e.mensaje || e.respuesta) && (
        <section className="flex flex-col gap-2 px-4 pt-6">
          <h2 className="titulo m-0 text-2xl">Conversación</h2>
          {e.mensaje && <p className="m-0 rounded-xl bg-papel p-3 text-[15px] ring-1 ring-linea"><span className="text-xs text-gris">Promotor</span><br />{e.mensaje}</p>}
          {e.respuesta && <p className="m-0 rounded-xl bg-naranja-suave p-3 text-[15px]"><span className="text-xs text-gris">Espacio</span><br />{e.respuesta}</p>}
        </section>
      )}

      {/* Acciones */}
      {(esEspacio || esAdmin) && e.estado === "PENDIENTE" && (
        <section className="px-4 pt-6">
          <form action={responder} className="tarjeta flex flex-col gap-3 p-4">
            <h2 className="titulo m-0 text-2xl">Responder propuesta</h2>
            <input type="hidden" name="evento_id" value={e.evento_id} />
            <textarea name="respuesta" rows={2} placeholder="Mensaje para el promotor (opcional)" className="campo" />
            <div className="grid grid-cols-2 gap-2">
              <BotonEnviar name="decision" value="aceptar" className="btn btn-primario">Aceptar</BotonEnviar>
              <BotonEnviar name="decision" value="rechazar" className="btn btn-borde" pendiente="…">Rechazar</BotonEnviar>
            </div>
          </form>
        </section>
      )}

      {(esEspacio || esAdmin) && e.estado === "ACEPTADA" && (
        <section className="px-4 pt-6">
          {e.fecha <= hoy() ? (
            <form action={realizar} className="tarjeta flex flex-col gap-3 p-4">
              <h2 className="titulo m-0 text-2xl">Cerrar evento</h2>
              <p className="m-0 text-sm text-gris">Si usaron QR Eventos, el conteo ya está puesto. Si no, escribe cuántas personas llegaron por cada promotor.</p>
              <input type="hidden" name="evento_id" value={e.evento_id} />
              {e.promotores.map((p) => (
                <label key={p.ep_id} className="flex items-center justify-between gap-3 text-[15px]">
                  <span>{p.promotor?.nombre}{qr[p.promotor_id] != null && <span className="text-xs text-ok"> · {qr[p.promotor_id]} con QR</span>}</span>
                  <input name={`reales_${p.promotor_id}`} type="number" min={0} defaultValue={qr[p.promotor_id] ?? p.asistentes_prometidos} readOnly={qr[p.promotor_id] != null} className="campo w-28 text-right" />
                </label>
              ))}
              <BotonEnviar>Marcar como realizado</BotonEnviar>
            </form>
          ) : (
            <p className="m-0 rounded-xl bg-gris-suave p-4 text-[15px]">Podrás cerrar el evento desde el {fechaCorta(e.fecha)}. Ese día abre <Link href="/puerta">Puerta</Link> para escanear los QR.</p>
          )}
        </section>
      )}

      {miEp && e.estado === "ACEPTADA" && (
        <section className="px-4 pt-6">
          <Link href="/qr" className="btn btn-oscuro w-full"><IcoQr />Contar mi gente con QR Eventos</Link>
        </section>
      )}

      {porCalificar.map((c) => (
        <section key={c.aId} className="px-4 pt-6">
          <form action={calificar} className="tarjeta flex flex-col gap-3 p-4">
            <h2 className="titulo m-0 text-2xl">Califica a {c.nombre}</h2>
            <p className="m-0 text-sm text-gris">Se publica cuando la otra parte también califique o en 14 días. No se muestra tu nombre al público.</p>
            <input type="hidden" name="evento_id" value={e.evento_id} />
            <input type="hidden" name="a_id" value={c.aId} />
            {Object.entries(DIMENSIONES[c.aTipo]).map(([k, t]) => (
              <fieldset key={k} className="m-0 flex flex-col gap-1.5 border-0 p-0">
                <legend className="pb-1 text-[15px] font-semibold">{t}</legend>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-linea bg-crema font-bold has-[:checked]:border-tinta has-[:checked]:bg-naranja">
                      <input type="radio" name={k} value={n} defaultChecked={n === 4} className="sr-only" />{n}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <textarea name="observaciones" rows={3} maxLength={600} placeholder="Observaciones (opcional)" className="campo" />
            <BotonEnviar pendiente="Enviando…">Enviar calificación</BotonEnviar>
          </form>
        </section>
      ))}

      {realizado && (
        <section className="flex flex-col gap-2 px-4 pt-6">
          <h2 className="titulo m-0 text-2xl">Calificaciones</h2>
          {pubCals.length === 0 && <p className="m-0 text-sm text-gris">Aún no hay calificaciones publicadas para este evento.</p>}
          {pubCals.map((c) => (
            <div key={c.calificacion_id} className="tarjeta flex flex-col gap-1 p-4">
              <div className="flex justify-between text-sm"><b>{nombreDe(c)} → {nombreA(c)}</b><span className="text-naranja-osc">★ {c.general}</span></div>
              {c.observaciones && <p className="m-0 text-[15px] text-concreto">“{c.observaciones}”</p>}
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2 px-4 pt-6">
        <h2 className="titulo m-0 text-2xl">Trazabilidad</h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
          <Paso t="Propuesta enviada" d={`${e.promotores.find((p) => p.promotor_id === e.creado_por)?.promotor?.nombre ?? "Promotor"} · ${fechaCorta(e.creado)}`} />
          {e.promotores.filter((p) => p.rol === "copromotor").map((p) => <Paso key={p.ep_id} t="Copromotor" d={p.promotor?.nombre ?? ""} />)}
          {["ACEPTADA", "REALIZADA"].includes(e.estado) && <Paso t="Confirmado" d={`por ${e.espacio?.nombre}`} />}
          {e.estado === "RECHAZADA" && <Paso t="Rechazado" d={`por ${e.espacio?.nombre}`} />}
          {e.estado === "CANCELADA" && <Paso t="Cancelado" d={e.respuesta} />}
          {realizado && <Paso t="Realizado" d={`${totalReal} asistentes · ${fechaCorta(e.fecha)}`} />}
          {realizado && cals.length > 0 && <Paso t="Calificado" d={ambos ? "por ambas partes" : "por una de las partes"} />}
        </ol>
      </section>

      {((esEspacio || esAdmin) || miEp?.rol === "principal") && ["PENDIENTE", "ACEPTADA"].includes(e.estado) && (
        <section className="px-4 pt-8">
          <form action={cancelar}>
            <input type="hidden" name="evento_id" value={e.evento_id} />
            <BotonEnviar className="btn btn-borde w-full" pendiente="Cancelando…">Cancelar evento</BotonEnviar>
          </form>
        </section>
      )}
    </>
  );
}

function Paso({ t, d }: { t: string; d: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-naranja" />
      <span><b>{t}</b>{d && <span className="text-concreto"> · {d}</span>}</span>
    </li>
  );
}
