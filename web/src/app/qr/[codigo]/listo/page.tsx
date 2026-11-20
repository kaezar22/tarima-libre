import Image from "next/image";
import { notFound } from "next/navigation";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { qrDataUrl } from "@/lib/qr";
import { QR_PREFIJO } from "@/lib/config";
import { fechaLarga } from "@/lib/fechas";
import { Mensajes, type SP } from "@/components/Mensajes";

export const metadata = { title: "Tu QR" };
export const dynamic = "force-dynamic";

export default async function Listo({ searchParams }: { params: Promise<{ codigo: string }>; searchParams: SP }) {
  const sp = await searchParams;
  const r = await db.obtener("registros", sp.r ?? "", true);
  if (!r) notFound();
  const [e, inv] = await Promise.all([m.evento(r.evento_id), db.obtener("invitaciones", r.codigo)]);
  if (!e) notFound();
  const qr = await qrDataUrl(QR_PREFIJO + r.registro_id);
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col items-center gap-4 px-5 pt-6 text-center">
        <h1 className="titulo m-0 text-4xl">¡Listo, {r.nombre.split(" ")[0]}!</h1>
        <p className="m-0 text-concreto">Muestra este código en la puerta. Es personal y sirve para una sola entrada.</p>
        <div className="rounded-3xl bg-papel p-5 ring-1 ring-linea">
          <Image src={qr} alt="Tu código QR de entrada" width={260} height={260} unoptimized />
          <p className="m-0 pt-2 font-mono text-sm tracking-widest text-gris">{r.registro_id.toUpperCase()}</p>
        </div>
        <div className="w-full rounded-2xl bg-papel p-4 text-left ring-1 ring-linea">
          <b className="text-lg">{e.nombre}</b><br />
          <span className="text-concreto">{fechaLarga(e.fecha)}{e.hora && ` · ${e.hora}`}<br />{e.espacio?.nombre} · {e.espacio?.barrio}</span>
          {inv?.beneficio && <p className="m-0 pt-2 text-[15px]"><b>Tu beneficio:</b> {inv.beneficio}</p>}
        </div>
        <a href={qr} download={`mi-qr-${e.nombre.replace(/\W+/g, "-").toLowerCase()}.png`} className="btn btn-primario w-full no-underline">Guardar imagen del QR</a>
        <p className="m-0 text-sm text-gris">
          {r.email_enviado === "SI" ? `También te lo enviamos a ${r.email}.` : "Guarda una captura de pantalla de este código."}
        </p>
      </section>
    </>
  );
}
