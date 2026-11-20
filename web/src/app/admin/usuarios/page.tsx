import * as db from "@/lib/db";
import { exigir } from "@/lib/auth";
import { PIN_LARGO } from "@/lib/config";
import { asignarPin, crearUsuario, estadoUsuario } from "../../acciones/admin";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Demo } from "@/components/Demo";
import { Mensajes, type SP } from "@/components/Mensajes";

export const metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function Usuarios({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  await exigir("admin");
  const usuarios = (await db.leer("usuarios", true)).sort((a, b) => (a.estado === "PENDIENTE" ? -1 : 1) - (b.estado === "PENDIENTE" ? -1 : 1) || b.creado.localeCompare(a.creado));
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-3 px-4 pt-6">
        <h1 className="titulo m-0 text-4xl">Usuarios</h1>
        {usuarios.map((x) => (
          <details key={x.usuario_id} className="tarjeta p-4" open={x.estado === "PENDIENTE"}>
            <summary className="flex cursor-pointer list-none items-center gap-2">
              <span className="flex-1"><b>{x.nombre}</b> <Demo si={x.demo} /><br /><span className="text-sm text-gris">{x.rol} · {x.email}</span></span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${x.estado === "ACTIVO" ? "bg-[#E3F2E7] text-ok" : x.estado === "PENDIENTE" ? "bg-naranja text-tinta" : "bg-gris-suave text-gris"}`}>{x.estado}</span>
            </summary>
            <div className="flex flex-col gap-3 pt-3">
              <p className="m-0 text-sm text-gris">Celular: {x.celular || "—"} · Último ingreso: {x.ultimo_ingreso || "nunca"}{x.bloqueado_hasta && ` · Bloqueado hasta ${x.bloqueado_hasta}`}</p>
              <form action={estadoUsuario} className="flex gap-2">
                <input type="hidden" name="usuario_id" value={x.usuario_id} />
                {x.estado !== "ACTIVO" && <BotonEnviar name="estado" value="ACTIVO" className="btn btn-chico btn-primario" pendiente="…">{x.estado === "PENDIENTE" ? "Aprobar" : "Activar"}</BotonEnviar>}
                {x.estado !== "INACTIVO" && <BotonEnviar name="estado" value="INACTIVO" className="btn btn-chico btn-borde" pendiente="…">{x.estado === "PENDIENTE" ? "Rechazar" : "Desactivar"}</BotonEnviar>}
              </form>
              <form action={asignarPin} className="flex gap-2">
                <input type="hidden" name="usuario_id" value={x.usuario_id} />
                <input name="pin" type="password" inputMode="numeric" maxLength={PIN_LARGO} placeholder="Nuevo PIN" aria-label="Nuevo PIN" required className="campo flex-1" />
                <BotonEnviar className="btn btn-chico btn-oscuro" pendiente="…">Asignar PIN</BotonEnviar>
              </form>
            </div>
          </details>
        ))}
      </section>
      <section className="px-4 pt-8">
        <form action={crearUsuario} className="tarjeta flex flex-col gap-3 p-4">
          <h2 className="titulo m-0 text-2xl">Crear usuario</h2>
          <select name="rol" className="campo" aria-label="Rol"><option value="promotor">Promotor / artista</option><option value="espacio">Espacio</option><option value="admin">Administrador</option></select>
          <input name="nombre" placeholder="Nombre" required className="campo" aria-label="Nombre" />
          <input name="email" type="email" placeholder="Correo" required className="campo" aria-label="Correo" />
          <input name="celular" type="tel" placeholder="Celular" className="campo" aria-label="Celular" />
          <input name="pin" type="password" inputMode="numeric" maxLength={PIN_LARGO} placeholder={`PIN inicial (${PIN_LARGO} dígitos)`} required className="campo" aria-label="PIN inicial" />
          <BotonEnviar>Crear</BotonEnviar>
        </form>
      </section>
    </>
  );
}
