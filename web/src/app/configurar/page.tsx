import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { configurar } from "../acciones/sesion";
import { Mensajes, type SP } from "@/components/Mensajes";
import { BotonEnviar } from "@/components/BotonEnviar";
import { PIN_LARGO } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Configurar({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if ((await db.leer("usuarios", true)).length) redirect("/ingresar");
  let base = "";
  try { base = await db.prepararTablas(); } catch (e) { base = `Error: ${e instanceof Error ? e.message : e}`; }
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-4 px-5 pt-8">
        <h1 className="titulo m-0 text-4xl">Configuración inicial</h1>
        <p className="m-0 text-sm text-gris">Base de datos: {base}</p>
        <p className="m-0">No hay usuarios todavía. Crea la cuenta de administrador.</p>
        <form action={configurar} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 font-semibold">Tu nombre<input name="nombre" required className="campo font-normal" /></label>
          <label className="flex flex-col gap-1.5 font-semibold">Tu correo<input name="email" type="email" required className="campo font-normal" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 font-semibold">PIN<input name="pin" type="password" inputMode="numeric" maxLength={PIN_LARGO} required className="campo font-normal" /></label>
            <label className="flex flex-col gap-1.5 font-semibold">Repite el PIN<input name="pin2" type="password" inputMode="numeric" maxLength={PIN_LARGO} required className="campo font-normal" /></label>
          </div>
          <label className="flex items-center gap-3"><input type="checkbox" name="demo" defaultChecked className="h-5 w-5 accent-[#EC6A24]" />Cargar datos de prueba (5 espacios, 8 promotores, 30 eventos)</label>
          <BotonEnviar pendiente="Creando…">Crear administrador</BotonEnviar>
        </form>
      </section>
    </>
  );
}
