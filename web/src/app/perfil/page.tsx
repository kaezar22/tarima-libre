import * as m from "@/lib/modelo";
import { exigir } from "@/lib/auth";
import { CIUDADES, GENEROS, PIN_LARGO } from "@/lib/config";
import { deepseekConfigurado } from "@/lib/deepseek";
import { cambiarPin, guardarDatos, guardarPromotor } from "../acciones/perfil";
import { salir } from "../acciones/sesion";
import { BotonEnviar } from "@/components/BotonEnviar";
import { FormInstagram } from "@/components/FormInstagram";
import { Pestanas } from "@/components/Pestanas";
import { Reputacion } from "@/components/Reputacion";
import { Mensajes, type SP } from "@/components/Mensajes";

export const metadata = { title: "Mi perfil" };
export const dynamic = "force-dynamic";

export default async function Perfil({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const u = await exigir();
  const esProm = u.rol === "promotor";
  const p = esProm ? await m.promotorDeUsuario(u.usuario_id) : undefined;
  const tab = sp.tab ?? (esProm ? "perfil" : "cuenta");
  const items: [string, string][] = esProm ? [["perfil", "Perfil"], ["instagram", "Instagram"], ["reputacion", "Reputación"], ["cuenta", "Cuenta"]] : [["cuenta", "Cuenta"]];
  return (
    <>
      <Mensajes sp={sp} />
      <section className="px-4 pt-6">
        <h1 className="titulo m-0 text-4xl">{p?.nombre ?? u.nombre}</h1>
        <p className="m-0 text-sm text-gris">{u.email} · {u.rol}</p>
      </section>
      {items.length > 1 && <Pestanas base="/perfil" actual={tab} items={items} />}
      <div className="px-4 pt-4">
        {tab === "perfil" && esProm && <FormPromotor p={p} nombre={u.nombre} />}
        {tab === "instagram" && esProm && <FormInstagram actual={await m.ultimoPerfilIg(u.usuario_id)} configurado={deepseekConfigurado()} instagram={p?.instagram} />}
        {tab === "reputacion" && esProm && (p ? <Reputacion rep={await m.reputacion("promotor", p.promotor_id)} tipo="promotor" /> : <p>Completa tu perfil primero.</p>)}
        {tab === "cuenta" && (
          <div className="flex flex-col gap-6">
            <form action={guardarDatos} className="flex flex-col gap-3">
              <h2 className="titulo m-0 text-2xl">Mis datos</h2>
              <label className="flex flex-col gap-1.5 font-semibold">Nombre<input name="nombre" defaultValue={u.nombre} className="campo font-normal" /></label>
              <label className="flex flex-col gap-1.5 font-semibold">Celular<input name="celular" type="tel" defaultValue={u.celular} className="campo font-normal" /></label>
              <BotonEnviar className="btn btn-oscuro">Guardar</BotonEnviar>
            </form>
            <form action={cambiarPin} className="flex flex-col gap-3">
              <h2 className="titulo m-0 text-2xl">Cambiar PIN</h2>
              {[["actual", "PIN actual"], ["nuevo", `Nuevo PIN (${PIN_LARGO} dígitos)`], ["nuevo2", "Repite el nuevo PIN"]].map(([n, t]) => (
                <label key={n} className="flex flex-col gap-1.5 font-semibold">{t}<input name={n} type="password" inputMode="numeric" maxLength={PIN_LARGO} required className="campo font-normal tracking-[.3em]" /></label>
              ))}
              <BotonEnviar className="btn btn-oscuro">Cambiar PIN</BotonEnviar>
            </form>
            <form action={salir}><BotonEnviar className="btn btn-borde w-full" pendiente="Saliendo…">Cerrar sesión</BotonEnviar></form>
          </div>
        )}
      </div>
    </>
  );
}

function FormPromotor({ p, nombre }: { p?: Record<string, string>; nombre: string }) {
  const sel = new Set(m.lista(p?.generos ?? ""));
  return (
    <form action={guardarPromotor} className="flex flex-col gap-4">
      {!p && <p className="m-0 rounded-xl bg-naranja-suave p-4">Completa tu perfil para que los espacios te conozcan y puedas proponer eventos.</p>}
      <label className="flex flex-col gap-1.5 font-semibold">Nombre artístico o productora<input name="nombre" required defaultValue={p?.nombre ?? nombre} className="campo font-normal" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 font-semibold">Soy
          <select name="tipo" defaultValue={p?.tipo || "promotor"} className="campo font-normal"><option value="promotor">Promotor</option><option value="artista">Artista</option><option value="ambos">Promotor y artista</option></select></label>
        <label className="flex flex-col gap-1.5 font-semibold">Ciudad<select name="ciudad" defaultValue={p?.ciudad || "Bogotá"} className="campo font-normal">{CIUDADES.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <fieldset className="m-0 border-0 p-0">
        <legend className="pb-2 font-semibold">Géneros que manejas</legend>
        <div className="flex flex-wrap gap-2">
          {GENEROS.map((g) => (
            <label key={g} className="flex min-h-10 cursor-pointer items-center rounded-full border-[1.5px] border-linea bg-papel px-3.5 text-sm has-[:checked]:border-tinta has-[:checked]:bg-tinta has-[:checked]:text-crema">
              <input type="checkbox" name="generos" value={g} defaultChecked={sel.has(g)} className="sr-only" />{g}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 font-semibold">Cuéntale a los espacios qué haces<textarea name="descripcion" rows={4} maxLength={800} defaultValue={p?.descripcion} className="campo font-normal" /></label>
      <label className="flex flex-col gap-1.5 font-semibold">Instagram<input name="instagram" defaultValue={p?.instagram} placeholder="@tucuenta" className="campo font-normal" /></label>
      <BotonEnviar>Guardar perfil</BotonEnviar>
    </form>
  );
}
