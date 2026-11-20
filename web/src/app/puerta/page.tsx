import Link from "next/link";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { exigir } from "@/lib/auth";
import { fechaCorta, hoy, sumarDias } from "@/lib/fechas";
import { Escaner } from "@/components/Escaner";

export const metadata = { title: "Puerta" };
export const dynamic = "force-dynamic";

export default async function Puerta() {
  const u = await exigir("espacio", "admin");
  let evs: m.EventoCompleto[];
  if (u.rol === "espacio") {
    const e = await m.espacioDeUsuario(u.usuario_id);
    evs = e ? await m.eventosDeEspacio(e.espacio_id, ["ACEPTADA"]) : [];
  } else {
    const ids = (await db.filtrar("eventos", { estado: "ACEPTADA" })).map((e) => e.evento_id);
    evs = (await Promise.all(ids.map((id) => m.evento(id)))).filter(Boolean) as m.EventoCompleto[];
  }
  const h = hoy();
  // Eventos de ayer, hoy y mañana primero (fiestas que pasan la medianoche)
  const cerca = evs.filter((e) => e.fecha >= sumarDias(h, -1) && e.fecha <= sumarDias(h, 1));
  const lista = (cerca.length ? cerca : evs).map((e) => ({ id: e.evento_id, nombre: `${e.nombre} · ${fechaCorta(e.fecha)}${u.rol === "admin" ? ` · ${e.espacio?.nombre}` : ""}` }));
  return (
    <section className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="titulo m-0 text-4xl">Puerta</h1>
      <p className="m-0 text-concreto">Escanea los QR de QR Eventos. Cada ingreso se suma al promotor que invitó y al historial del evento.</p>
      {lista.length === 0
        ? <p className="m-0 rounded-xl bg-gris-suave p-4">No hay eventos confirmados. Los verás aquí cuando aceptes una propuesta (<Link href="/eventos">ver eventos</Link>).</p>
        : <Escaner eventos={lista} />}
    </section>
  );
}
