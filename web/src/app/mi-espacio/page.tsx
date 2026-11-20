import Image from "next/image";
import Link from "next/link";
import * as m from "@/lib/modelo";
import * as db from "@/lib/db";
import { exigir } from "@/lib/auth";
import { CIUDADES, GENEROS, MAX_FOTOS_ESPACIO, TIPOS_BENEFICIO, TIPOS_ESPACIO } from "@/lib/config";
import { sinOptimizar, fotosConfiguradas, listaFotos, miniatura } from "@/lib/fotos";
import { deepseekConfigurado } from "@/lib/deepseek";
import { guardarBeneficios, guardarEspacio, quitarFoto } from "../acciones/espacio";
import { BotonEnviar } from "@/components/BotonEnviar";
import { BloquesBeneficios } from "@/components/Beneficios";
import { Reputacion } from "@/components/Reputacion";
import { FormInstagram } from "@/components/FormInstagram";
import { Pestanas } from "@/components/Pestanas";
import { SubirFotos } from "@/components/SubirFotos";
import { Mensajes, type SP } from "@/components/Mensajes";
import { Aviso } from "@/components/Aviso";
import { IcoPersona, IcoPublico } from "@/components/Iconos";

export const metadata = { title: "Mi espacio" };
export const dynamic = "force-dynamic";

export default async function MiEspacio({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const u = await exigir("espacio");
  const e = await m.espacioDeUsuario(u.usuario_id);
  const tab = e ? sp.tab ?? "resumen" : "datos";
  return (
    <>
      <Mensajes sp={sp} />
      <section className="px-4 pt-6">
        <h1 className="titulo m-0 text-4xl">{e?.nombre ?? "Registra tu espacio"}</h1>
        {e && (e.verificado === "SI"
          ? <p className="m-0 pt-1 text-sm font-semibold text-ok">Verificado y publicado · <Link href={`/espacios/${e.espacio_id}`}>Ver cómo lo ven los promotores</Link></p>
          : <p className="m-0 pt-1 text-sm text-concreto">Pendiente de verificación: te visitaremos antes de publicarlo. Mientras tanto completa datos, fotos y beneficios.</p>)}
      </section>
      {e && <Pestanas base="/mi-espacio" actual={tab} items={[["resumen", "Resumen"], ["datos", "Datos"], ["fotos", "Fotos"], ["beneficios", "Beneficios"], ["instagram", "Instagram"]]} />}
      <div className="px-4 pt-4">
        {tab === "resumen" && e && <Resumen e={e} />}
        {tab === "datos" && <Datos e={e} />}
        {tab === "fotos" && e && <Fotos e={e} />}
        {tab === "beneficios" && e && <Beneficios espacioId={e.espacio_id} />}
        {tab === "instagram" && e && <FormInstagram actual={await m.ultimoPerfilIg(u.usuario_id)} configurado={deepseekConfigurado()} instagram={e.instagram} />}
      </div>
    </>
  );
}

async function Resumen({ e }: { e: Record<string, string> }) {
  const [rep, pend] = await Promise.all([m.reputacion("espacio", e.espacio_id), m.eventosDeEspacio(e.espacio_id, ["PENDIENTE"])]);
  return (
    <div className="flex flex-col gap-5">
      {pend.length > 0 && <Link href="/eventos?f=pendientes" className="rounded-2xl bg-naranja p-4 font-bold text-tinta no-underline">Tienes {pend.length} propuesta(s) por responder →</Link>}
      <Reputacion rep={rep} tipo="espacio" />
    </div>
  );
}

function Datos({ e }: { e?: Record<string, string> }) {
  const sel = new Set(m.lista(e?.generos ?? ""));
  return (
    <form action={guardarEspacio} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 font-semibold">Nombre del espacio<input name="nombre" required defaultValue={e?.nombre} className="campo font-normal" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 font-semibold">Tipo<select name="tipo" defaultValue={e?.tipo} className="campo font-normal">{TIPOS_ESPACIO.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="flex flex-col gap-1.5 font-semibold">Capacidad<input name="capacidad" type="number" min={1} defaultValue={e?.capacidad || 100} className="campo font-normal" /></label>
        <label className="flex flex-col gap-1.5 font-semibold">Ciudad<select name="ciudad" defaultValue={e?.ciudad || "Bogotá"} className="campo font-normal">{CIUDADES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="flex flex-col gap-1.5 font-semibold">Barrio<input name="barrio" defaultValue={e?.barrio} className="campo font-normal" /></label>
      </div>
      <label className="flex flex-col gap-1.5 font-semibold">Dirección <span className="text-sm font-normal text-gris">Solo la ven promotores registrados</span><input name="direccion" defaultValue={e?.direccion} className="campo font-normal" /></label>
      <fieldset className="m-0 border-0 p-0">
        <legend className="pb-2 font-semibold">Géneros y tipo de público</legend>
        <div className="flex flex-wrap gap-2">
          {GENEROS.map((g) => (
            <label key={g} className="flex min-h-10 cursor-pointer items-center rounded-full border-[1.5px] border-linea bg-papel px-3.5 text-sm has-[:checked]:border-tinta has-[:checked]:bg-tinta has-[:checked]:text-crema">
              <input type="checkbox" name="generos" value={g} defaultChecked={sel.has(g)} className="sr-only" />{g}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 font-semibold">Descripción<textarea name="descripcion" rows={4} maxLength={1000} defaultValue={e?.descripcion} placeholder="Tarima, sonido, horarios, permisos…" className="campo font-normal" /></label>
      <label className="flex flex-col gap-1.5 font-semibold">Instagram<input name="instagram" defaultValue={e?.instagram} placeholder="@tuespacio" className="campo font-normal" /></label>
      <BotonEnviar>{e ? "Guardar datos" : "Crear espacio"}</BotonEnviar>
    </form>
  );
}

function Fotos({ e }: { e: Record<string, string> }) {
  const fotos = listaFotos(e.fotos);
  const puede = fotosConfiguradas() || db.esLocal();
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-concreto">{fotos.length} de {MAX_FOTOS_ESPACIO} fotos. Muestra la tarima, la barra y el lugar lleno. La primera es la portada.</p>
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {fotos.map((f, i) => (
            <div key={f.url} className="flex flex-col gap-1.5">
              <Image src={miniatura(f.url, 500)} alt={`Foto ${i + 1}`} width={500} height={310} className="aspect-[16/10] w-full rounded-xl object-cover" unoptimized={sinOptimizar(f.url)} />
              <form action={quitarFoto}><input type="hidden" name="url" value={f.url} /><BotonEnviar className="btn btn-chico btn-borde w-full" pendiente="Quitando…">Quitar</BotonEnviar></form>
            </div>
          ))}
        </div>
      )}
      {puede ? <SubirFotos cupo={MAX_FOTOS_ESPACIO - fotos.length} /> : <Aviso tipo="error">Falta configurar Cloudinary (CLOUDINARY_URL) para subir fotos.</Aviso>}
    </div>
  );
}

async function Beneficios({ espacioId }: { espacioId: string }) {
  const actuales = await db.filtrar("beneficios", { espacio_id: espacioId });
  const bs = await m.beneficiosDe(espacioId);
  const fila = (tipo: string) => actuales.find((b) => b.tipo === tipo);
  const bloque = (para: "promotor" | "publico") => Object.entries(TIPOS_BENEFICIO).filter(([, t]) => t.para === para).map(([k, t]) => {
    const b = fila(k);
    return (
      <div key={k} className="flex flex-col gap-1.5 border-b border-black/10 py-3 last:border-0">
        <div className="flex items-center gap-3">
          <input type="checkbox" id={`on_${k}`} name={`on_${k}`} defaultChecked={b?.activo === "SI"} className="h-5 w-5 flex-none accent-[#EC6A24]" />
          <label htmlFor={`on_${k}`} className="flex-1 text-[15px] font-semibold">{t.etiqueta}</label>
          <div className="flex items-center gap-1 rounded-xl border-[1.5px] border-linea bg-papel px-2.5">
            {t.unidad === "COP" && <span className="text-sm text-gris">$</span>}
            <input name={`v_${k}`} defaultValue={b?.valor} inputMode={t.unidad === "hora" ? "text" : "numeric"} placeholder={t.unidad === "hora" ? "10 p.m." : "0"}
              aria-label={`Valor: ${t.etiqueta}`} className="h-11 w-20 bg-transparent text-right font-semibold outline-none" />
            {t.unidad && t.unidad !== "COP" && t.unidad !== "hora" && <span className="text-sm text-gris">{t.unidad}</span>}
          </div>
        </div>
        <input name={`c_${k}`} defaultValue={b?.condicion} placeholder="Condición (opcional)" aria-label={`Condición: ${t.etiqueta}`} className="ml-8 rounded-lg bg-white/70 px-3 py-2 text-sm outline-none" />
      </div>
    );
  });
  return (
    <form action={guardarBeneficios} className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-concreto">Separa lo que gana el promotor de lo que recibe su público. Marca los que ofreces y escribe el valor.</p>
      <section className="rounded-2xl bg-naranja-suave p-4">
        <h2 className="titulo m-0 flex items-center gap-2 text-2xl text-naranja-osc"><IcoPersona />Para el promotor</h2>
        {bloque("promotor")}
      </section>
      <section className="rounded-2xl bg-gris-suave p-4">
        <h2 className="titulo m-0 flex items-center gap-2 text-2xl text-concreto"><IcoPublico />Para su público</h2>
        {bloque("publico")}
      </section>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-[.08em] text-gris">ASÍ LO VEN LOS PROMOTORES HOY</span>
        <BloquesBeneficios promotor={bs.promotor.map((b) => b.texto)} publico={bs.publico.map((b) => b.texto)} compacto />
      </div>
      <BotonEnviar>Guardar beneficios</BotonEnviar>
    </form>
  );
}
