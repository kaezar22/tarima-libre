import Link from "next/link";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { exigir } from "@/lib/auth";
import { GENEROS } from "@/lib/config";
import { Demo } from "@/components/Demo";
import { Estrellas } from "@/components/Estrellas";
import { type SP } from "@/components/Mensajes";

export const metadata = { title: "Promotores" };
export const dynamic = "force-dynamic";

const TIPO: Record<string, string> = { promotor: "Promotor", artista: "Artista", ambos: "Promotor y artista" };

export default async function Promotores({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  await exigir("espacio", "admin");
  let proms = await db.leer("promotores");
  if (sp.genero) proms = proms.filter((p) => m.lista(p.generos).includes(sp.genero!));
  if (sp.q) proms = proms.filter((p) => `${p.nombre} ${p.generos} ${p.descripcion}`.toLowerCase().includes(sp.q!.toLowerCase()));
  const conRep = await Promise.all(proms.map(async (p) => ({ ...(p as object), rep: await m.reputacion("promotor", p.promotor_id), ig: await m.ultimoPerfilIg(p.usuario_id) }) as m.Fila & { rep: m.Reputacion; ig?: m.Fila }));
  conRep.sort((a, b) => (b.rep.promedios.general ?? 0) - (a.rep.promedios.general ?? 0));
  return (
    <section className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="titulo m-0 text-4xl">Promotores y artistas</h1>
      <form className="grid grid-cols-[1fr_auto] gap-2" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Buscar" aria-label="Buscar promotores" className="campo" />
        <select name="genero" defaultValue={sp.genero ?? ""} aria-label="Género" className="campo">
          <option value="">Género</option>{GENEROS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <button className="btn btn-oscuro col-span-2">Filtrar</button>
      </form>
      <p className="m-0 text-sm text-gris">{conRep.length} perfil(es) · ordenados por reputación</p>
      {conRep.map((p) => (
        <Link key={p.promotor_id} href={`/promotores/${p.promotor_id}`} className="tarjeta flex flex-col gap-2 p-4 text-tinta no-underline">
          <div className="flex items-center gap-2"><span className="titulo text-2xl">{p.nombre}</span><Demo si={p.demo} className="ml-auto" /></div>
          <span className="text-sm text-gris">{TIPO[p.tipo] ?? "Promotor"} · {p.ciudad}{p.instagram && ` · ${p.instagram}`}</span>
          <div className="flex flex-wrap items-center gap-x-2 text-sm"><Estrellas valor={p.rep.promedios.general} n={p.rep.n} />
            <span className="text-gris">· {p.rep.eventosRealizados} eventos · {p.rep.asistentesTotales.toLocaleString("es-CO")} personas</span></div>
          {p.ig && <span className="text-sm"><b>Promueve:</b> {p.ig.tipo_contenido}</span>}
          <div className="flex flex-wrap gap-1.5">{m.lista(p.generos).map((g) => <span key={g} className="etiqueta">{g}</span>)}</div>
        </Link>
      ))}
    </section>
  );
}
