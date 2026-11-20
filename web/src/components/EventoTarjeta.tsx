import Link from "next/link";
import type { EventoCompleto } from "@/lib/modelo";
import { ESTADOS_EVENTO } from "@/lib/config";
import { fechaCorta } from "@/lib/fechas";
import { Demo } from "./Demo";

export function EventoTarjeta({ e, mostrarEspacio = true }: { e: EventoCompleto; mostrarEspacio?: boolean }) {
  const realizado = e.estado === "REALIZADA";
  return (
    <Link href={`/eventos/${e.evento_id}`} className="tarjeta flex flex-col gap-2 p-4 text-tinta no-underline hover:ring-2 hover:ring-tinta/10">
      <div className="flex items-center justify-between text-[13px] text-gris">
        <span>{fechaCorta(e.fecha)} · {e.genero}{!realizado && ` · ${ESTADOS_EVENTO[e.estado]}`}</span>
        <Demo si={e.demo} />
      </div>
      <span className="text-[17px] font-bold leading-tight">{e.nombre}</span>
      <div className="text-[13px] leading-relaxed text-concreto">
        {mostrarEspacio && e.espacio && <div><b>Espacio:</b> {e.espacio.nombre}</div>}
        <div><b>Promotores:</b> {e.promotores.map((p) => `${p.promotor?.nombre ?? "?"}${realizado ? ` (${p.asistentes_reales || 0})` : ""}`).join(" · ")}</div>
        {e.artistasLista.length > 0 && <div><b>Artistas:</b> {e.artistasLista.join(", ")}</div>}
      </div>
      {realizado && (
        <div className="flex items-center justify-between border-t border-linea pt-2 text-sm">
          <span><b className="text-lg text-naranja-osc">{e.asistentes_reales}</b> asistentes · {e.asistentes_esperados} esperados</span>
        </div>
      )}
    </Link>
  );
}
