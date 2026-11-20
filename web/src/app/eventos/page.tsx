import Link from "next/link";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { exigir } from "@/lib/auth";
import { hoy } from "@/lib/fechas";
import { EventoTarjeta } from "@/components/EventoTarjeta";
import { Mensajes, type SP } from "@/components/Mensajes";

export const metadata = { title: "Eventos" };
export const dynamic = "force-dynamic";

const FILTROS = [["proximos", "Próximos"], ["pendientes", "Propuestas"], ["realizados", "Realizados"], ["todos", "Todos"]] as const;

export default async function Eventos({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const u = await exigir();
  let evs: m.EventoCompleto[] = [];
  let titulo = "Mis eventos";
  if (u.rol === "promotor") {
    const p = await m.promotorDeUsuario(u.usuario_id);
    if (!p) return <section className="px-4 pt-8"><h1 className="titulo text-4xl">Mis eventos</h1><p>Completa tu <Link href="/perfil">perfil de promotor</Link> para empezar.</p></section>;
    evs = await m.eventosDePromotor(p.promotor_id);
  } else if (u.rol === "espacio") {
    const e = await m.espacioDeUsuario(u.usuario_id);
    if (!e) return <section className="px-4 pt-8"><h1 className="titulo text-4xl">Eventos</h1><p>Primero registra tu espacio en <Link href="/mi-espacio">Mi espacio</Link>.</p></section>;
    evs = await m.eventosDeEspacio(e.espacio_id);
    titulo = "Eventos en mi espacio";
  } else {
    const todos = await db.leer("eventos");
    evs = (await Promise.all(todos.map((e) => m.evento(e.evento_id)))).filter(Boolean) as m.EventoCompleto[];
    evs.sort((a, b) => b.fecha.localeCompare(a.fecha));
    titulo = "Todos los eventos";
  }
  const h = hoy();
  const f = sp.f ?? (evs.some((e) => e.estado === "PENDIENTE") ? "pendientes" : "proximos");
  const visibles = evs.filter((e) =>
    f === "proximos" ? e.estado === "ACEPTADA" && e.fecha >= h :
    f === "pendientes" ? e.estado === "PENDIENTE" || (e.estado === "ACEPTADA" && e.fecha < h) :
    f === "realizados" ? e.estado === "REALIZADA" : true);
  if (f === "proximos") visibles.reverse();
  const n = (k: string) => evs.filter((e) => k === "pendientes" ? e.estado === "PENDIENTE" || (e.estado === "ACEPTADA" && e.fecha < h) : k === "proximos" ? e.estado === "ACEPTADA" && e.fecha >= h : k === "realizados" ? e.estado === "REALIZADA" : true).length;
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-4 px-4 pt-6">
        <h1 className="titulo m-0 text-4xl">{titulo}</h1>
        <nav aria-label="Filtrar eventos" className="flex gap-2 overflow-x-auto pb-1">
          {FILTROS.map(([k, t]) => (
            <Link key={k} href={`/eventos?f=${k}`} aria-current={f === k ? "page" : undefined}
              className={`flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold no-underline ${f === k ? "bg-tinta text-crema" : "border border-linea bg-papel text-tinta"}`}>
              {t}<span className={f === k ? "text-naranja" : "text-gris"}>{n(k)}</span>
            </Link>
          ))}
        </nav>
        {f === "pendientes" && <p className="m-0 text-sm text-gris">Propuestas por responder y eventos confirmados que ya pasaron y falta cerrar.</p>}
        {visibles.length === 0 && <p className="m-0 text-gris">Nada por aquí.{u.rol === "promotor" && <> <Link href="/espacios">Busca un espacio</Link> para proponer tu próximo evento.</>}</p>}
        {visibles.map((e) => <EventoTarjeta key={e.evento_id} e={e} mostrarEspacio={u.rol !== "espacio"} />)}
      </section>
    </>
  );
}
