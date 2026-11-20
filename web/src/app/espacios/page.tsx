import Image from "next/image";
import Link from "next/link";
import { buscarEspacios, lista, num } from "@/lib/modelo";
import { usuarioActual } from "@/lib/auth";
import { sinOptimizar, listaFotos, miniatura } from "@/lib/fotos";
import { CIUDADES, GENEROS, TIPOS_BENEFICIO, TIPOS_ESPACIO } from "@/lib/config";
import { Demo } from "@/components/Demo";
import { Estrellas } from "@/components/Estrellas";
import { BloquesBeneficios } from "@/components/Beneficios";
import { IcoCheck } from "@/components/Iconos";
import { Mensajes, type SP } from "@/components/Mensajes";

export const metadata = { title: "Espacios" };
export const dynamic = "force-dynamic";

const CAPS: Record<string, [number, number]> = { "": [0, 0], chico: [0, 120], medio: [121, 300], grande: [301, 0] };

export default async function Espacios({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const u = await usuarioActual();
  const verBeneficios = u?.rol === "promotor" || u?.rol === "admin";
  const [capMin, capMax] = CAPS[sp.cap ?? ""] ?? [0, 0];
  const res = await buscarEspacios({
    ciudad: sp.ciudad ?? "Bogotá", genero: sp.genero, tipo: sp.tipo, texto: sp.q, capMin, capMax,
    beneficio: verBeneficios ? sp.beneficio : undefined,
    soloVerificados: !(u?.rol === "admin" && sp.todos === "1"),
  });
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-4 px-4 pt-6">
        <h1 className="titulo m-0 text-4xl">Encuentra tu tarima</h1>
        <form className="flex flex-col gap-2" role="search">
          <input name="q" defaultValue={sp.q} placeholder="Nombre, barrio o género" aria-label="Buscar" className="campo" />
          <div className="grid grid-cols-2 gap-2">
            <select name="ciudad" defaultValue={sp.ciudad ?? "Bogotá"} aria-label="Ciudad" className="campo">
              <option value="">Todas las ciudades</option>{CIUDADES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select name="genero" defaultValue={sp.genero ?? ""} aria-label="Género" className="campo">
              <option value="">Todos los géneros</option>{GENEROS.map((g) => <option key={g}>{g}</option>)}
            </select>
            <select name="tipo" defaultValue={sp.tipo ?? ""} aria-label="Tipo de espacio" className="campo">
              <option value="">Todo tipo</option>{TIPOS_ESPACIO.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select name="cap" defaultValue={sp.cap ?? ""} aria-label="Capacidad" className="campo">
              <option value="">Cualquier capacidad</option><option value="chico">Hasta 120</option>
              <option value="medio">121 a 300</option><option value="grande">Más de 300</option>
            </select>
            {verBeneficios && (
              <select name="beneficio" defaultValue={sp.beneficio ?? ""} aria-label="Beneficio" className="campo col-span-2">
                <option value="">Cualquier beneficio</option>
                {Object.entries(TIPOS_BENEFICIO).map(([k, t]) => <option key={k} value={k}>{t.para === "promotor" ? "Para mí" : "Para mi público"}: {t.etiqueta}</option>)}
              </select>
            )}
          </div>
          {u?.rol === "admin" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="todos" value="1" defaultChecked={sp.todos === "1"} />Incluir sin verificar</label>}
          <button className="btn btn-oscuro">Buscar</button>
        </form>
        <p className="m-0 text-sm text-gris">{res.length} espacio(s) · ordenados por reputación</p>
        {!verBeneficios && <p className="m-0 rounded-xl bg-naranja-suave px-4 py-3 text-[15px]"><Link href="/ingresar">Ingresa como promotor</Link> para ver comisiones, beneficios e historial.</p>}
      </section>

      <section className="flex flex-col gap-4 px-4 pt-4">
        {res.map((e) => {
          const foto = listaFotos(e.fotos)[0];
          return (
            <Link key={e.espacio_id} href={`/espacios/${e.espacio_id}`} className="tarjeta flex flex-col overflow-hidden text-tinta no-underline">
              {foto
                ? <Image src={miniatura(foto.url)} alt={`Foto de ${e.nombre}`} width={800} height={496} className="h-44 w-full object-cover" unoptimized={sinOptimizar(foto.url)} />
                : <div className="concreto flex h-28 items-center justify-center"><Image src="/brand/logo-mark.png" alt="" width={70} height={59} className="opacity-60" /></div>}
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="titulo text-2xl">{e.nombre}</span>
                  {e.verificado === "SI" ? <IcoCheck size={20} className="text-ok" /> : <span className="etiqueta">Sin verificar</span>}
                  <Demo si={e.demo} className="ml-auto" />
                </div>
                <span className="text-sm text-gris">{e.tipo} · {e.barrio} · {num(e.capacidad)} personas</span>
                <div className="flex flex-wrap items-center gap-x-2 text-sm"><Estrellas valor={e.rep.promedios.general} n={e.rep.n} /><span className="text-gris">· {e.rep.eventosRealizados} eventos</span></div>
                <div className="flex flex-wrap gap-1.5">{lista(e.generos).map((g) => <span key={g} className="etiqueta">{g}</span>)}</div>
                {verBeneficios && <div className="pt-1"><BloquesBeneficios promotor={e.beneficios.promotor} publico={e.beneficios.publico} compacto /></div>}
              </div>
            </Link>
          );
        })}
      </section>
    </>
  );
}
