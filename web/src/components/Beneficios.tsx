import { IcoPersona, IcoPublico } from "./Iconos";

export function BloquesBeneficios({ promotor, publico, compacto = false }: { promotor: string[]; publico: string[]; compacto?: boolean }) {
  if (compacto) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-naranja-suave p-3">
          <div className="text-[11px] font-bold tracking-[.06em] text-naranja-osc">PARA TI</div>
          <div className="pt-1 text-[13px] leading-snug">{promotor.length ? promotor.map((t) => <div key={t}>{t}</div>) : <span className="text-gris">Sin beneficios publicados</span>}</div>
        </div>
        <div className="rounded-xl bg-gris-suave p-3">
          <div className="text-[11px] font-bold tracking-[.06em] text-concreto">PARA TU PÚBLICO</div>
          <div className="pt-1 text-[13px] leading-snug">{publico.length ? publico.map((t) => <div key={t}>{t}</div>) : <span className="text-gris">Sin beneficios publicados</span>}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-naranja-suave p-4">
        <div className="flex items-center gap-2 pb-2 text-naranja-osc"><IcoPersona size={18} /><span className="text-xs font-bold tracking-[.08em]">PARA EL PROMOTOR</span></div>
        {promotor.length ? <ul className="flex flex-col gap-1.5 text-[15px]">{promotor.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="text-sm text-gris">Este espacio aún no publica beneficios para promotores.</p>}
      </div>
      <div className="rounded-2xl bg-gris-suave p-4">
        <div className="flex items-center gap-2 pb-2 text-concreto"><IcoPublico size={18} /><span className="text-xs font-bold tracking-[.08em]">PARA TU PÚBLICO</span></div>
        {publico.length ? <ul className="flex flex-col gap-1.5 text-[15px]">{publico.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="text-sm text-gris">Sin beneficios para el público.</p>}
      </div>
    </div>
  );
}
