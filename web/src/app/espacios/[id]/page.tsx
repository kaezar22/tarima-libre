import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { usuarioActual } from "@/lib/auth";
import { sinOptimizar, listaFotos } from "@/lib/fotos";
import { Demo } from "@/components/Demo";
import { BloquesBeneficios } from "@/components/Beneficios";
import { Reputacion, Observaciones, GraficaAsistencia } from "@/components/Reputacion";
import { EventoTarjeta } from "@/components/EventoTarjeta";
import { PerfilIg } from "@/components/PerfilIg";
import { IcoCheck, IcoVolver } from "@/components/Iconos";

export const dynamic = "force-dynamic";

export default async function FichaEspacio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [e, u] = await Promise.all([db.obtener("espacios", id), usuarioActual()]);
  if (!e || (e.verificado !== "SI" && u?.rol !== "admin" && e.usuario_id !== u?.usuario_id)) notFound();
  const registrado = !!u;
  const verBeneficios = u?.rol === "promotor" || u?.rol === "admin" || e.usuario_id === u?.usuario_id;
  const [bs, rep, eventos, ig] = await Promise.all([
    m.beneficiosDe(id), m.reputacion("espacio", id), m.eventosDeEspacio(id, ["REALIZADA"]), m.ultimoPerfilIg(e.usuario_id),
  ]);
  const fotos = listaFotos(e.fotos);
  return (
    <article className={u?.rol === "promotor" ? "pb-24" : "pb-6"}>
      <div className="relative">
        {fotos[0]
          ? <Image src={fotos[0].url} alt={`Foto de ${e.nombre}`} width={1200} height={750} className="h-64 w-full object-cover" priority unoptimized={sinOptimizar(fotos[0].url)} />
          : <div className="concreto flex h-48 items-center justify-center"><Image src="/brand/logo-mark.png" alt="" width={110} height={92} className="opacity-70" /></div>}
        <Link href="/espacios" aria-label="Volver a espacios" className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-crema/90 text-tinta"><IcoVolver /></Link>
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-2">
          {fotos.slice(1).map((f) => <Image key={f.url} src={f.url} alt="" width={240} height={160} className="h-24 w-36 flex-none rounded-lg object-cover" unoptimized={sinOptimizar(f.url)} />)}
        </div>
      )}

      <section className="flex flex-col gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <h1 className="titulo m-0 text-4xl">{e.nombre}</h1>
          {e.verificado === "SI" && <IcoCheck size={24} className="text-ok" />}
          <Demo si={e.demo} className="ml-auto" />
        </div>
        <span className="text-concreto">{e.tipo} · {e.barrio}, {e.ciudad} · {m.num(e.capacidad)} personas</span>
        {verBeneficios && e.direccion && <span className="text-sm text-gris">{e.direccion}{e.instagram && ` · ${e.instagram}`}</span>}
        <div className="flex flex-wrap gap-1.5">{m.lista(e.generos).map((g) => <span key={g} className="etiqueta">{g}</span>)}</div>
        {e.descripcion && <p className="m-0 text-[16px] leading-relaxed text-concreto">{e.descripcion}</p>}
      </section>

      <section className="flex flex-col gap-3 px-4 pt-6">
        <h2 className="titulo m-0 text-2xl">Lo que ofrece</h2>
        {verBeneficios
          ? <BloquesBeneficios promotor={bs.promotor.map((b) => b.texto + (b.condicion ? ` (${b.condicion})` : ""))} publico={bs.publico.map((b) => b.texto + (b.condicion ? ` (${b.condicion})` : ""))} />
          : <p className="m-0 rounded-xl bg-naranja-suave px-4 py-3"><Link href="/ingresar">Ingresa como promotor</Link> para ver comisiones y beneficios.</p>}
      </section>

      <section className="flex flex-col gap-3 px-4 pt-6">
        <h2 className="titulo m-0 text-2xl">Reputación</h2>
        <Reputacion rep={rep} tipo="espacio" />
        {registrado && <Observaciones rep={rep} />}
      </section>

      <section className="flex flex-col gap-3 px-4 pt-6">
        <h2 className="titulo m-0 text-2xl">Historial de eventos</h2>
        {registrado ? (
          <>
            <GraficaAsistencia serie={rep.serie} />
            {eventos.length === 0 && <p className="m-0 text-gris">Aún no hay eventos realizados.</p>}
            {eventos.slice(0, 10).map((ev) => <EventoTarjeta key={ev.evento_id} e={ev} mostrarEspacio={false} />)}
          </>
        ) : (
          <div className="tarjeta divide-y divide-linea">
            {eventos.slice(0, 8).map((ev) => (
              <div key={ev.evento_id} className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 font-semibold">{ev.nombre}<Demo si={ev.demo} /></span>
                <span className="titulo text-xl text-naranja-osc">{ev.asistentes_reales}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {ig && <section className="px-4 pt-6"><PerfilIg p={ig} titulo="Lo que publica en Instagram" /></section>}

      {u?.rol === "promotor" && (
        <div className="fixed inset-x-0 bottom-[68px] z-20 border-t border-linea bg-crema/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-2xl"><Link href={`/eventos/nuevo?espacio=${id}`} className="btn btn-primario w-full">Proponer un evento</Link></div>
        </div>
      )}
    </article>
  );
}
