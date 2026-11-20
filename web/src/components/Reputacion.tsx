import { DIMENSIONES } from "@/lib/config";
import type { Reputacion as Rep } from "@/lib/modelo";
import { fechaCorta, mesCorto } from "@/lib/fechas";
import { Demo } from "./Demo";

export function Reputacion({ rep, tipo }: { rep: Rep; tipo: "espacio" | "promotor" }) {
  const dims = DIMENSIONES[tipo];
  const g = rep.promedios.general;
  const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <div className="flex flex-col">
          <span className="titulo text-[52px] leading-none">{g == null ? "—" : g.toFixed(1)}</span>
          <span className="text-sm text-naranja-osc" aria-hidden="true">{g == null ? "" : "★".repeat(Math.round(g)) + "☆".repeat(5 - Math.round(g))}</span>
          <span className="text-xs text-gris">{rep.n} calificación(es)</span>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 text-[13px]">
          {(["cumplimiento", "comunicacion", "calidad"] as const).map((d) => (
            <div key={d}>
              <div className="flex justify-between"><span>{dims[d]}</span><b>{rep.promedios[d]?.toFixed(1) ?? "—"}</b></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-gris-suave">
                <div className="h-full rounded bg-naranja" style={{ width: `${((rep.promedios[d] ?? 0) / 5) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Dato n={String(rep.eventosRealizados)} t="eventos realizados" />
        <Dato n={rep.asistentesTotales.toLocaleString("es-CO")} t={tipo === "espacio" ? "asistentes verificados" : "personas llevadas"} />
        {tipo === "promotor"
          ? <Dato n={pct(rep.asistenciaVsPrometida)} t="de lo que promete" />
          : <Dato n={pct(rep.tasaCumplimiento)} t="confirmados que se hicieron" />}
      </div>
      {rep.n === 0 && <p className="text-sm text-gris">Las calificaciones se publican cuando ambas partes califican el evento o pasan 14 días.</p>}
    </div>
  );
}

function Dato({ n, t }: { n: string; t: string }) {
  return (
    <div className="rounded-xl bg-papel p-3 ring-1 ring-linea">
      <div className="text-[22px] font-bold leading-tight">{n}</div>
      <div className="text-xs text-gris">{t}</div>
    </div>
  );
}

export function GraficaAsistencia({ serie }: { serie: Rep["serie"] }) {
  const datos = serie.slice(-8);
  if (!datos.length) return <p className="text-sm text-gris">Sin eventos realizados todavía.</p>;
  const max = Math.max(...datos.map((d) => Math.max(d.prometidos, d.reales)), 1);
  return (
    <figure className="tarjeta p-4">
      <div className="flex h-36 items-end gap-2" role="img"
        aria-label={`Asistencia de los últimos ${datos.length} eventos: ${datos.map((d) => `${d.nombre}, ${d.reales} de ${d.prometidos}`).join("; ")}`}>
        {datos.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-28 w-full items-end justify-center gap-[3px]">
              <span className="w-2.5 rounded-t bg-[#BDB8AC]" style={{ height: `${(d.prometidos / max) * 100}%` }} />
              <span className="w-2.5 rounded-t bg-naranja" style={{ height: `${(d.reales / max) * 100}%` }} />
            </div>
            <span className="text-[11px] text-gris">{mesCorto(d.fecha)}</span>
          </div>
        ))}
      </div>
      <figcaption className="flex gap-4 pt-3 text-xs text-gris">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#BDB8AC]" />Prometidos</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-naranja" />Llegaron</span>
      </figcaption>
    </figure>
  );
}

export function Observaciones({ rep }: { rep: Rep }) {
  const obs = rep.calificaciones.filter((c) => c.observaciones).slice(-4).reverse();
  if (!obs.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {obs.map((c) => (
        <blockquote key={c.calificacion_id} className="m-0 rounded-xl bg-papel p-3.5 text-[14px] leading-snug ring-1 ring-linea">
          “{c.observaciones}”
          <div className="flex items-center gap-2 pt-1.5 text-xs text-gris">
            <span>{c.evento?.nombre} · {fechaCorta(c.evento?.fecha ?? "")}</span><Demo si={c.demo} />
          </div>
        </blockquote>
      ))}
    </div>
  );
}
