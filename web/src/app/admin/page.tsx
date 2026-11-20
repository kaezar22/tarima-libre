import Link from "next/link";
import * as db from "@/lib/db";
import { exigir } from "@/lib/auth";
import { fotosConfiguradas, listaFotos } from "@/lib/fotos";
import { deepseekConfigurado } from "@/lib/deepseek";
import { correoConfigurado } from "@/lib/correo";
import { hayDemo, PIN_DEMO, ESPACIOS, PROMOTORES } from "@/lib/demo";
import { demo, verificarEspacio } from "../acciones/admin";
import { BotonEnviar } from "@/components/BotonEnviar";
import { Demo } from "@/components/Demo";
import { Mensajes, type SP } from "@/components/Mensajes";

export const metadata = { title: "Administración" };
export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const u = await exigir("admin");
  const snap = await db.snapshot(true);
  const usuarios = new Map(snap.usuarios.map((x) => [x.usuario_id, x]));
  const pendientes = snap.espacios.filter((e) => e.verificado !== "SI");
  const solicitudes = snap.usuarios.filter((x) => x.estado === "PENDIENTE").length;
  let conexion = "";
  try { conexion = await db.prepararTablas(); } catch (e) { conexion = `Error: ${e instanceof Error ? e.message : e}`; }
  const demoCargado = await hayDemo();
  return (
    <>
      <Mensajes sp={sp} />
      <section className="flex flex-col gap-4 px-4 pt-6">
        <h1 className="titulo m-0 text-4xl">Administración</h1>
        <p className="m-0 text-sm text-gris">Hola, {u.nombre}.</p>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/admin/usuarios" className="tarjeta p-4 text-tinta no-underline"><div className="titulo text-3xl">{snap.usuarios.length}</div><div className="text-sm text-gris">usuarios{solicitudes > 0 && <b className="text-naranja-osc"> · {solicitudes} por aprobar</b>}</div></Link>
          <Link href="/eventos?f=todos" className="tarjeta p-4 text-tinta no-underline"><div className="titulo text-3xl">{snap.eventos.length}</div><div className="text-sm text-gris">eventos</div></Link>
        </div>
      </section>

      <section className="flex flex-col gap-3 px-4 pt-8">
        <h2 className="titulo m-0 text-2xl">Espacios por verificar ({pendientes.length})</h2>
        <p className="m-0 text-sm text-gris">Márcalos como verificados solo después de visitarlos.</p>
        {pendientes.length === 0 && <p className="m-0 text-gris">No hay espacios pendientes.</p>}
        {pendientes.map((e) => {
          const d = usuarios.get(e.usuario_id);
          return (
            <form key={e.espacio_id} action={verificarEspacio} className="tarjeta flex flex-col gap-2 p-4">
              <input type="hidden" name="espacio_id" value={e.espacio_id} />
              <div className="flex items-center gap-2"><b className="text-lg">{e.nombre}</b><Demo si={e.demo} /></div>
              <span className="text-sm text-concreto">{e.tipo} · {e.barrio}, {e.ciudad} · cap. {e.capacidad} · {listaFotos(e.fotos).length} fotos</span>
              <span className="text-sm text-gris">{e.direccion || "Sin dirección"} · {d?.nombre} · {d?.email} · {d?.celular}</span>
              <textarea name="notas" rows={2} defaultValue={e.notas_verificacion} placeholder="Notas de la visita (solo admin)" className="campo" />
              <div className="flex gap-2">
                <BotonEnviar name="accion" value="verificar" className="btn btn-primario flex-1">Marcar verificado</BotonEnviar>
                <Link href={`/espacios/${e.espacio_id}`} className="btn btn-borde">Ver</Link>
              </div>
            </form>
          );
        })}
      </section>

      <section className="flex flex-col gap-2 px-4 pt-8">
        <h2 className="titulo m-0 text-2xl">Sistema</h2>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
          <li>Base de datos: <b>{conexion}</b></li>
          <li>Fotos (Cloudinary): <b>{fotosConfiguradas() ? "configurado" : "sin configurar"}</b></li>
          <li>Instagram (DeepSeek): <b>{deepseekConfigurado() ? "configurado" : "sin configurar"}</b></li>
          <li>Correo del QR (SMTP): <b>{correoConfigurado() ? "configurado" : "sin configurar: el QR solo se muestra en pantalla"}</b></li>
        </ul>
      </section>

      <section className="flex flex-col gap-2 px-4 pt-8">
        <h2 className="titulo m-0 text-2xl">Datos de prueba</h2>
        {demoCargado ? (
          <>
            <p className="m-0 text-[15px]">Cargados. Todos los usuarios demo entran con el PIN <b>{PIN_DEMO}</b>:</p>
            <pre className="m-0 overflow-x-auto rounded-xl bg-papel p-3 text-xs ring-1 ring-linea">{[...ESPACIOS.map((e) => e.email), ...PROMOTORES.map((p) => `${p.clave}@demo.tarima`)].join("\n")}</pre>
            <p className="m-0 text-sm text-gris">Para quitarlos, borra en la hoja las filas con demo = SI.</p>
          </>
        ) : (
          <form action={demo}><BotonEnviar className="btn btn-oscuro" pendiente="Cargando…">Cargar 30 eventos de prueba</BotonEnviar></form>
        )}
      </section>
    </>
  );
}
