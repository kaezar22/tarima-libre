import type { Fila } from "@/lib/config";
import { fechaCorta } from "@/lib/fechas";
import { IcoInsta } from "./Iconos";

export function PerfilIg({ p, titulo = "Tipo de eventos que promueve" }: { p?: Fila; titulo?: string }) {
  if (!p) return null;
  const etiquetas: string[] = String(p.etiquetas || "").split(",").map((s) => s.trim()).filter(Boolean);
  const generos: string[] = p.generos ? String(p.generos).split(",") : [];
  return (
    <section className="tarjeta flex flex-col gap-2.5 p-4">
      <div className="flex items-center gap-2 text-naranja-osc"><IcoInsta size={18} /><span className="text-xs font-bold tracking-[.08em]">{titulo.toUpperCase()}</span></div>
      <span className="text-[17px] font-bold leading-snug">{p.tipo_contenido}</span>
      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <div><span className="text-gris">Público</span><br />{p.publico}</div>
        <div><span className="text-gris">Tono</span><br />{p.tono}</div>
      </div>
      {p.resumen && <p className="m-0 text-sm text-concreto">{p.resumen}</p>}
      <div className="flex flex-wrap gap-1.5">
        {generos.map((g) => <span key={g} className="etiqueta font-semibold">{g.trim()}</span>)}
        {etiquetas.map((e) => <span key={e} className="etiqueta">{e}</span>)}
      </div>
      <span className="text-xs text-gris">Análisis automático del texto de {p.instagram || "su Instagram"} · {fechaCorta(p.creado)}</span>
    </section>
  );
}
