import Image from "next/image";
import Link from "next/link";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { exigir } from "@/lib/auth";
import { qrDataUrl } from "@/lib/qr";
import { fechaCorta, hoy } from "@/lib/fechas";
import { crearInvitacion } from "../acciones/qr";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Copiar } from "@/components/Copiar";
import { Demo } from "@/components/Demo";
import { Mensajes, type SP } from "@/components/Mensajes";
import { IcoQr } from "@/components/Iconos";

export const metadata = { title: "QR Eventos" };
export const dynamic = "force-dynamic";

const base = () => (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

export default async function Qr({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const u = await exigir("promotor");
  const p = await m.promotorDeUsuario(u.usuario_id);
  if (!p) return <section className="px-4 pt-8"><h1 className="titulo text-4xl">QR Eventos</h1><p>Completa tu <Link href="/perfil">perfil</Link> primero.</p></section>;
  const eventos = (await m.eventosDePromotor(p.promotor_id, ["ACEPTADA"])).filter((e) => e.fecha >= hoy()).reverse();
  const invs = await db.filtrar("invitaciones", { promotor_id: p.promotor_id }, true);
  const regs = await db.leer("registros", true);
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-3 px-4 pt-6">
        <div className="flex items-center gap-3"><IcoQr size={30} className="text-naranja-osc" /><div><h1 className="titulo m-0 text-4xl leading-none">QR Eventos</h1><span className="text-sm text-gris">por Tarima Libre</span></div></div>
        <p className="m-0 text-[16px] text-concreto">Invita a tu gente: cada seguidor se registra y recibe un QR personal. En la puerta se escanea y queda contado a tu nombre en el historial del evento.</p>
      </section>
      <section className="flex flex-col gap-4 px-4 pt-5">
        {eventos.length === 0 && <p className="m-0 rounded-xl bg-gris-suave p-4">No tienes eventos confirmados próximos. <Link href="/espacios">Propón uno</Link> y, cuando el espacio lo acepte, aquí creas tu invitación.</p>}
        {await Promise.all(eventos.map(async (e) => {
          const inv = invs.find((i) => i.evento_id === e.evento_id);
          if (!inv) {
            return (
              <form key={e.evento_id} action={crearInvitacion} className="tarjeta flex flex-col gap-3 p-4">
                <input type="hidden" name="evento_id" value={e.evento_id} />
                <div><span className="text-sm text-gris">{fechaCorta(e.fecha)} · {e.espacio?.nombre}</span><div className="flex items-center gap-2 text-lg font-bold">{e.nombre}<Demo si={e.demo} /></div></div>
                <label className="flex flex-col gap-1.5 text-sm font-semibold">Nombre que verán tus seguidores<input name="nombre_artista" defaultValue={p.nombre} className="campo font-normal" /></label>
                <BotonEnviar pendiente="Creando…">Crear invitación</BotonEnviar>
              </form>
            );
          }
          const link = `${base()}/qr/${inv.codigo}`;
          const mios = regs.filter((r) => r.codigo === inv.codigo);
          const prometidos = e.promotores.find((x) => x.promotor_id === p.promotor_id)?.asistentes_prometidos;
          return (
            <div key={e.evento_id} className={`flex flex-col items-center gap-3 rounded-3xl bg-papel p-5 ring-1 ${sp.inv === inv.codigo ? "ring-2 ring-naranja" : "ring-linea"}`}>
              <div className="self-stretch"><span className="text-sm text-gris">{fechaCorta(e.fecha)} · {e.espacio?.nombre}</span><div className="flex items-center gap-2 text-lg font-bold">{e.nombre}<Demo si={e.demo} /></div></div>
              <Image src={await qrDataUrl(link)} alt={`Código QR de la invitación a ${e.nombre}`} width={220} height={220} unoptimized />
              <span className="font-bold">{link.replace(/^https?:\/\//, "")}</span>
              {inv.beneficio && <span className="self-stretch rounded-xl bg-gris-suave p-3 text-sm"><b>Beneficio para tu público:</b> {inv.beneficio}</span>}
              <div className="grid w-full grid-cols-3 gap-2 text-center">
                <Dato n={mios.length} t="registrados" /><Dato n={mios.filter((r) => r.checkin === "SI").length} t="ingresaron" /><Dato n={prometidos ?? "—"} t="prometidos" />
              </div>
              <div className="grid w-full grid-cols-2 gap-2">
                <a className="btn col-span-2 bg-[#25D366] text-[#0B2914] no-underline" href={`https://wa.me/?text=${encodeURIComponent(`¡Te invito a ${e.nombre}! Regístrate y recibe tu QR de entrada: ${link}`)}`} target="_blank" rel="noopener">Compartir por WhatsApp</a>
                <Copiar texto={link} />
                <a className="btn btn-borde no-underline" href={await qrDataUrl(link)} download={`qr-${inv.codigo}.png`}>Descargar QR</a>
              </div>
            </div>
          );
        }))}
      </section>
    </>
  );
}

function Dato({ n, t }: { n: number | string; t: string }) {
  return <div className="rounded-xl bg-crema p-2"><div className="titulo text-2xl">{n}</div><div className="text-xs text-gris">{t}</div></div>;
}
