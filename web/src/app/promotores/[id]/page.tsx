import Link from "next/link";
import { notFound } from "next/navigation";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { exigir } from "@/lib/auth";
import { Demo } from "@/components/Demo";
import { Reputacion, GraficaAsistencia, Observaciones } from "@/components/Reputacion";
import { EventoTarjeta } from "@/components/EventoTarjeta";
import { PerfilIg } from "@/components/PerfilIg";
import { IcoVolver } from "@/components/Iconos";

export const dynamic = "force-dynamic";
const TIPO: Record<string, string> = { promotor: "Promotor", artista: "Artista", ambos: "Promotor y artista" };

export default async function PerfilPromotor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigir(); // promotores, espacios y admin con sesión
  const p = await db.obtener("promotores", id);
  if (!p) notFound();
  const [rep, eventos, ig] = await Promise.all([m.reputacion("promotor", id), m.eventosDePromotor(id, ["REALIZADA"]), m.ultimoPerfilIg(p.usuario_id)]);
  const iniciales = p.nombre.split(/\s+/).slice(0, 2).map((x: string) => x[0]).join("").toUpperCase();
  return (
    <article className="flex flex-col gap-6 px-4 pt-3">
      <div className="flex items-center"><Link href="/promotores" aria-label="Volver" className="-ml-2 flex h-11 w-11 items-center justify-center text-tinta"><IcoVolver /></Link><Demo si={p.demo} className="ml-auto" /></div>
      <header className="-mt-4 flex items-center gap-4">
        <span aria-hidden="true" className="titulo flex h-16 w-16 flex-none items-center justify-center rounded-full bg-tinta text-2xl text-crema">{iniciales}</span>
        <div>
          <h1 className="titulo m-0 text-4xl">{p.nombre}</h1>
          <span className="text-concreto">{TIPO[p.tipo] ?? "Promotor"} · {p.ciudad}{p.instagram && ` · ${p.instagram}`}</span>
        </div>
      </header>
      {p.descripcion && <p className="m-0 -mt-2 text-[16px] leading-relaxed text-concreto">{p.descripcion}</p>}
      {ig ? <PerfilIg p={ig} /> : <p className="m-0 rounded-xl bg-gris-suave p-4 text-sm text-concreto">Este perfil aún no tiene análisis de Instagram.</p>}
      <section className="flex flex-col gap-3"><h2 className="titulo m-0 text-2xl">Reputación</h2><Reputacion rep={rep} tipo="promotor" /><Observaciones rep={rep} /></section>
      <section className="flex flex-col gap-3"><h2 className="titulo m-0 text-2xl">Asistencia por evento</h2><GraficaAsistencia serie={rep.serie} /></section>
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><h2 className="titulo m-0 text-2xl">Eventos pasados</h2><span className="text-sm text-gris">{eventos.length}</span></div>
        {eventos.length === 0 && <p className="m-0 text-gris">Aún no tiene eventos realizados.</p>}
        {eventos.map((e) => <EventoTarjeta key={e.evento_id} e={e} />)}
      </section>
    </article>
  );
}
