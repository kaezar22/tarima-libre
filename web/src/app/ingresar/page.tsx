import Link from "next/link";
import { redirect } from "next/navigation";
import { ingresar } from "../acciones/sesion";
import { usuarioActual } from "@/lib/auth";
import { Mensajes, type SP } from "@/components/Mensajes";
import { BotonEnviar } from "@/components/BotonEnviar";
import { PIN_LARGO } from "@/lib/config";

export const metadata = { title: "Ingresar" };

export default async function Ingresar({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  if (await usuarioActual()) redirect("/");
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-5 px-5 pt-8">
        <h1 className="titulo m-0 text-4xl">Ingresar</h1>
        <form action={ingresar} className="flex flex-col gap-4">
          <input type="hidden" name="destino" value={sp.destino ?? ""} />
          <label className="flex flex-col gap-1.5 font-semibold">Correo
            <input name="email" type="email" autoComplete="email" required defaultValue={sp.email} className="campo font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 font-semibold">PIN ({PIN_LARGO} dígitos)
            <input name="pin" type="password" inputMode="numeric" pattern="\d*" maxLength={PIN_LARGO} autoComplete="current-password" required className="campo font-normal tracking-[.4em]" />
          </label>
          <BotonEnviar pendiente="Verificando…">Ingresar</BotonEnviar>
        </form>
        <p className="m-0 text-gris">¿No tienes cuenta? <Link href="/solicitar">Solicita acceso al beta</Link>.</p>
        <p className="m-0 text-sm text-gris">¿Olvidaste tu PIN? Escríbenos a <a href="mailto:hello@tarimalibre.com">hello@tarimalibre.com</a>.</p>
      </section>
    </>
  );
}
