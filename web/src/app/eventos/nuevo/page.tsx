import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import * as m from "@/lib/modelo";
import { exigir } from "@/lib/auth";
import { GENEROS } from "@/lib/config";
import { hoy, sumarDias } from "@/lib/fechas";
import { proponer } from "../../acciones/eventos";
import { BotonEnviar } from "@/components/BotonEnviar";
import { BloquesBeneficios } from "@/components/Beneficios";
import { Mensajes, type SP } from "@/components/Mensajes";

export const metadata = { title: "Proponer evento" };

export default async function Nuevo({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const u = await exigir("promotor");
  const yo = await m.promotorDeUsuario(u.usuario_id);
  if (!yo) redirect("/perfil?error=Completa+tu+perfil+de+promotor+primero.");
  const e = await db.obtener("espacios", sp.espacio ?? "");
  if (!e || e.verificado !== "SI") redirect("/espacios");
  const bs = await m.beneficiosDe(e.espacio_id);
  const otros = (await db.leer("promotores")).filter((p) => p.promotor_id !== yo.promotor_id).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const generos = m.lista(e.generos);
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-4 px-4 pt-6">
        <div>
          <p className="m-0 text-sm text-gris">Propuesta para</p>
          <h1 className="titulo m-0 text-4xl">{e.nombre}</h1>
          <p className="m-0 text-sm text-gris">{e.barrio} · {m.num(e.capacidad)} personas</p>
        </div>
        <BloquesBeneficios promotor={bs.promotor.map((b) => b.texto)} publico={bs.publico.map((b) => b.texto)} compacto />
        <form action={proponer} className="flex flex-col gap-4">
          <input type="hidden" name="espacio_id" value={e.espacio_id} />
          <label className="flex flex-col gap-1.5 font-semibold">Nombre del evento<input name="nombre" required minLength={3} className="campo font-normal" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 font-semibold">Fecha<input name="fecha" type="date" required min={hoy()} defaultValue={sumarDias(hoy(), 14)} className="campo font-normal" /></label>
            <label className="flex flex-col gap-1.5 font-semibold">Hora<input name="hora" placeholder="9:00 p.m." className="campo font-normal" /></label>
          </div>
          <label className="flex flex-col gap-1.5 font-semibold">Género
            <select name="genero" defaultValue={generos[0]} className="campo font-normal">{GENEROS.map((g) => <option key={g}>{g}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 font-semibold">Artistas<input name="artistas" placeholder="Separados por coma" className="campo font-normal" /></label>
          <label className="flex flex-col gap-1.5 font-semibold">¿Cuántas personas traes tú?<input name="prometidos" type="number" min={1} max={10000} defaultValue={50} required className="campo font-normal" /></label>

          <fieldset className="m-0 flex flex-col gap-2 rounded-2xl border border-linea bg-papel p-4">
            <legend className="px-1 font-semibold">Otros promotores (opcional)</legend>
            <p className="m-0 text-sm text-gris">Marca a quienes promueven contigo y cuánta gente trae cada uno. Cada uno tendrá su propio QR para contar su gente.</p>
            <div className="flex max-h-72 flex-col overflow-y-auto">
              {otros.map((p) => (
                <div key={p.promotor_id} className="flex items-center gap-3 border-b border-linea py-2 last:border-0">
                  <input type="checkbox" id={`co_${p.promotor_id}`} name="copromotor" value={p.promotor_id} className="h-5 w-5 flex-none accent-[#EC6A24]" />
                  <label htmlFor={`co_${p.promotor_id}`} className="flex-1 text-[15px]">{p.nombre}</label>
                  <input name={`prometidos_${p.promotor_id}`} type="number" min={0} placeholder="0" aria-label={`Personas que trae ${p.nombre}`} className="campo w-24 text-right" />
                </div>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 font-semibold">Mensaje para el espacio
            <textarea name="mensaje" rows={4} placeholder="Line-up, horario, necesidades técnicas…" className="campo font-normal" /></label>
          <BotonEnviar pendiente="Enviando…">Enviar propuesta</BotonEnviar>
        </form>
      </section>
    </>
  );
}
