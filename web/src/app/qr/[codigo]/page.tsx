import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { fechaLarga } from "@/lib/fechas";
import { listaFotos, sinOptimizar } from "@/lib/fotos";
import { registrarSeguidor } from "../../acciones/qr";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Demo } from "@/components/Demo";
import { Mensajes, type SP } from "@/components/Mensajes";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }) {
  const inv = await db.obtener("invitaciones", (await params).codigo.toUpperCase());
  const e = inv ? await db.obtener("eventos", inv.evento_id) : undefined;
  return { title: e ? `Invitación: ${e.nombre}` : "Invitación" };
}

export default async function Registro({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: SP }) {
  const [{ codigo }, sp] = await Promise.all([params, searchParams]);
  const inv = await db.obtener("invitaciones", codigo.toUpperCase());
  if (!inv) notFound();
  const e = await m.evento(inv.evento_id);
  if (!e) notFound();
  const portada = listaFotos(e.espacio?.fotos ?? "")[0]?.url;
  const abierto = inv.activa === "SI" && ["ACEPTADA", "PENDIENTE"].includes(e.estado);
  return (
    <>
      <section className="concreto relative isolate flex flex-col gap-3 overflow-hidden px-5 pb-7 pt-24">
        {portada && <Image src={portada} alt="" fill sizes="100vw" className="-z-20 object-cover" unoptimized={sinOptimizar(portada)} />}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-tinta/20 via-tinta/70 to-tinta/95" />
        <div className="flex items-center gap-2"><Image src="/brand/logo-mark.png" alt="" width={48} height={40} /><span className="text-sm text-[#D8D3C8]">{inv.nombre_artista} te invita</span><Demo si={e.demo} className="ml-auto" /></div>
        <h1 className="titulo m-0 text-[42px] text-crema">{e.nombre}</h1>
        <p className="m-0 text-[17px] text-[#E4E0D6]">{fechaLarga(e.fecha)}{e.hora && ` · ${e.hora}`}<br />{e.espacio?.nombre} · {e.espacio?.barrio}, {e.espacio?.ciudad}</p>
        {e.artistasLista.length > 0 && <p className="m-0 text-[15px] text-[#D8D3C8]">Con {e.artistasLista.join(", ")}</p>}
      </section>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-4 px-5 pt-5">
        {inv.beneficio && <div className="rounded-2xl bg-naranja-suave p-4"><span className="text-xs font-bold tracking-[.08em] text-naranja-osc">TU BENEFICIO AL REGISTRARTE</span><p className="m-0 pt-1 text-[16px] font-semibold">{inv.beneficio}</p></div>}
        {!abierto ? <p className="m-0 rounded-xl bg-gris-suave p-4">El registro para este evento ya cerró.</p> : (
          <form action={registrarSeguidor} className="flex flex-col gap-4">
            <input type="hidden" name="codigo" value={inv.codigo} />
            <h2 className="titulo m-0 text-2xl">Regístrate y recibe tu QR</h2>
            <label className="flex flex-col gap-1.5 font-semibold">Nombre<input name="nombre" required defaultValue={sp.nombre} autoComplete="name" className="campo font-normal" /></label>
            <label className="flex flex-col gap-1.5 font-semibold">Correo<input name="email" type="email" required defaultValue={sp.email} autoComplete="email" className="campo font-normal" /></label>
            <label className="flex flex-col gap-1.5 font-semibold">Celular<input name="celular" type="tel" required defaultValue={sp.celular} autoComplete="tel" className="campo font-normal" /></label>
            <label className="flex items-start gap-3 text-[15px]"><input type="checkbox" name="acepta" required className="mt-1 h-5 w-5 accent-[#EC6A24]" />
              <span>Acepto la <Link href="/privacidad" target="_blank">política de tratamiento de datos</Link>. El promotor y el espacio solo ven conteos, no mis datos.</span></label>
            <BotonEnviar pendiente="Generando tu QR…">Quiero mi QR</BotonEnviar>
          </form>
        )}
        <p className="m-0 text-xs text-gris">QR Eventos por Tarima Libre · tarimalibre.com</p>
      </section>
    </>
  );
}
