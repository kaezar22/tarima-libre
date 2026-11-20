import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { historialPublico } from "@/lib/modelo";
import { usuarioActual } from "@/lib/auth";
import { Demo } from "@/components/Demo";
import { Pie } from "@/components/Pie";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  if (!(await db.leer("usuarios")).length) redirect("/configurar");
  const [eventos, u] = await Promise.all([historialPublico(8), usuarioActual()]);
  return (
    <>
      <section className="relative isolate overflow-hidden bg-tinta px-5 pb-10 pt-40 text-crema sm:pt-56">
        <Image src="/fotos/hero-movil.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover sm:hidden" />
        <Image src="/fotos/hero-ancho.jpg" alt="" fill priority sizes="100vw" className="-z-20 hidden object-cover sm:block" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-tinta/10 via-tinta/55 to-tinta/95" />
        <div className="flex flex-col gap-5">
          <Image src="/brand/logo-mark.png" alt="" width={84} height={71} priority />
          <h1 className="titulo m-0 text-[46px] text-crema">Tu próximo toque empieza con la tarima correcta</h1>
          <p className="m-0 text-[17px] leading-relaxed text-[#E4E0D6]">
            Promotores y artistas encuentran bares, clubs y restaurantes con beneficios claros. Los espacios llenan sus noches con promotores que cumplen.
          </p>
          {!u && (
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Link href="/solicitar?rol=promotor" className="btn btn-primario">Soy promotor o artista</Link>
              <Link href="/solicitar?rol=espacio" className="btn border-[1.5px] border-crema text-crema">Tengo un espacio</Link>
            </div>
          )}
          {u && <Link href={u.rol === "espacio" ? "/mi-espacio" : u.rol === "admin" ? "/admin" : "/espacios"} className="btn btn-primario self-start">Ir a mi panel</Link>}
        </div>
      </section>

      <section className="flex flex-col gap-4 px-5 pt-8">
        <h2 className="titulo m-0 text-3xl">Cómo funciona</h2>
        {[
          ["Busca espacios verificados", "por género, capacidad y lo que ofrecen al promotor y a su público."],
          ["Propón tu evento", "solo o con otros promotores, y cuenta tu gente en la puerta con QR Eventos."],
          ["Califíquense mutuamente.", "Cada evento queda en el historial y suma a la reputación de ambos."],
        ].map(([t, d], i) => (
          <div key={t} className="flex items-start gap-4">
            <span className="titulo flex h-10 w-10 flex-none items-center justify-center rounded-full bg-naranja text-xl">{i + 1}</span>
            <p className="m-0 pt-1.5 text-[16px] leading-snug text-concreto"><b className="text-tinta">{t}</b> {d}</p>
          </div>
        ))}
      </section>

      <section aria-label="Escenas de la red" className="flex snap-x gap-3 overflow-x-auto px-5 pt-8">
        {[["club-1", "Cabinas listas para tu DJ"], ["club-3", "Clubs con luces y sonido"], ["club-9", "Noches que se llenan"]].map(([f, t]) => (
          <figure key={f} className="relative m-0 h-56 w-72 flex-none snap-start overflow-hidden rounded-2xl">
            <Image src={`/fotos/${f}.jpg`} alt={t} fill sizes="288px" className="object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-tinta/90 to-transparent p-3 pt-8 text-sm font-semibold text-crema">{t}</figcaption>
          </figure>
        ))}
      </section>

      <section className="flex flex-col gap-3 px-5 pt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="titulo m-0 text-3xl">Eventos recientes</h2>
          <span className="text-sm text-gris">Asistentes verificados</span>
        </div>
        <div className="tarjeta divide-y divide-linea">
          {eventos.length === 0 && <p className="m-0 p-4 text-gris">Aún no hay eventos realizados.</p>}
          {eventos.map((e) => (
            <div key={e.evento_id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <span className="flex items-center gap-2 font-semibold">{e.nombre}<Demo si={e.demo} /></span>
              <span className="titulo text-2xl text-naranja-osc">{e.asistentes}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative isolate mx-5 mt-10 flex flex-col gap-2 overflow-hidden rounded-2xl bg-tinta p-6 pt-28 text-crema">
        <Image src="/fotos/club-8.jpg" alt="" fill sizes="(max-width: 672px) 100vw, 640px" className="-z-20 object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-tinta/20 via-tinta/75 to-tinta" />
        <span className="text-xs font-bold tracking-[.12em] text-naranja">HERRAMIENTA INCLUIDA</span>
        <h2 className="titulo m-0 text-3xl">QR Eventos: cuenta cuánta gente traes</h2>
        <p className="m-0 text-[15px] leading-relaxed text-[#D8D3C8]">Cada seguidor recibe un QR personal. En la puerta se escanea y queda contado a tu nombre, en el historial del evento.</p>
        <Link href={u ? "/qr" : "/solicitar?rol=promotor"} className="btn btn-primario mt-2 self-start">Crear mi invitación</Link>
      </section>
      <Pie />
    </>
  );
}
