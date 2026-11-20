import Link from "next/link";
import { solicitar } from "../acciones/sesion";
import { Mensajes, type SP } from "@/components/Mensajes";
import { BotonEnviar } from "@/components/BotonEnviar";
import { PIN_LARGO } from "@/lib/config";

export const metadata = { title: "Solicitar acceso" };

export default async function Solicitar({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const rol = sp.rol === "espacio" ? "espacio" : "promotor";
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-4 px-5 pt-8">
        <h1 className="titulo m-0 text-4xl">Solicitar acceso</h1>
        <p className="m-0 text-concreto">Estamos en beta cerrado: revisamos cada solicitud y visitamos los espacios antes de publicarlos.</p>
        {!sp.ok && (
          <form action={solicitar} className="flex flex-col gap-4">
            <fieldset className="m-0 grid grid-cols-2 gap-2 border-0 p-0">
              <legend className="pb-1.5 font-semibold">Soy…</legend>
              {[["promotor", "Promotor o artista"], ["espacio", "Espacio (bar, club…)"]].map(([v, t]) => (
                <label key={v} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-linea bg-papel px-3 has-[:checked]:border-tinta has-[:checked]:bg-naranja-suave">
                  <input type="radio" name="rol" value={v} defaultChecked={rol === v} className="accent-[#EC6A24]" />{t}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1.5 font-semibold">Nombre (tuyo, de tu productora o del espacio)
              <input name="nombre" required defaultValue={sp.nombre} className="campo font-normal" /></label>
            <label className="flex flex-col gap-1.5 font-semibold">Correo
              <input name="email" type="email" required defaultValue={sp.email} className="campo font-normal" /></label>
            <label className="flex flex-col gap-1.5 font-semibold">Celular
              <input name="celular" type="tel" defaultValue={sp.celular} className="campo font-normal" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 font-semibold">Crea un PIN
                <input name="pin" type="password" inputMode="numeric" maxLength={PIN_LARGO} required className="campo font-normal tracking-[.3em]" /></label>
              <label className="flex flex-col gap-1.5 font-semibold">Repítelo
                <input name="pin2" type="password" inputMode="numeric" maxLength={PIN_LARGO} required className="campo font-normal tracking-[.3em]" /></label>
            </div>
            <p className="-mt-2 m-0 text-sm text-gris">{PIN_LARGO} dígitos. Evita 123456 o números repetidos.</p>
            <label className="flex items-start gap-3 text-[15px]">
              <input type="checkbox" name="acepta" required className="mt-1 h-5 w-5 accent-[#EC6A24]" />
              <span>Acepto la <Link href="/privacidad" target="_blank">política de tratamiento de datos personales</Link>.</span>
            </label>
            <BotonEnviar pendiente="Enviando…">Enviar solicitud</BotonEnviar>
          </form>
        )}
        {sp.ok && <Link href="/" className="btn btn-borde self-start">Volver al inicio</Link>}
      </section>
    </>
  );
}
