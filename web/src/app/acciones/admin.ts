"use server";
import { revalidatePath } from "next/cache";
import * as auth from "@/lib/auth";
import * as db from "@/lib/db";
import { cargarDemo } from "@/lib/demo";
import { ahora } from "@/lib/fechas";
import type { Rol } from "@/lib/config";
import { txt, volver } from "./util";

export async function verificarEspacio(fd: FormData) {
  const u = await auth.exigir("admin");
  const id = txt(fd, "espacio_id", 40);
  const si = txt(fd, "accion") === "verificar";
  await db.actualizar("espacios", id, si
    ? { verificado: "SI", verificado_por: u.email, verificado_fecha: ahora(), notas_verificacion: txt(fd, "notas", 800) }
    : { verificado: "NO", notas_verificacion: txt(fd, "notas", 800) });
  revalidatePath("/", "layout");
  volver("/admin", { ok: si ? "Espacio verificado y publicado." : "Verificación retirada." });
}

export async function estadoUsuario(fd: FormData) {
  await auth.exigir("admin");
  const estado = txt(fd, "estado");
  if (!["ACTIVO", "INACTIVO"].includes(estado)) volver("/admin/usuarios");
  await db.actualizar("usuarios", txt(fd, "usuario_id", 40), { estado });
  volver("/admin/usuarios", { ok: estado === "ACTIVO" ? "Usuario activado." : "Usuario desactivado." });
}

export async function crearUsuario(fd: FormData) {
  await auth.exigir("admin");
  const rol = (["espacio", "promotor", "admin"].includes(txt(fd, "rol")) ? txt(fd, "rol") : "promotor") as Rol;
  const nombre = txt(fd, "nombre", 120), email = txt(fd, "email", 200), pin = txt(fd, "pin", 10);
  if (nombre.length < 2 || !auth.emailValido(email)) volver("/admin/usuarios", { error: "Revisa nombre y correo." });
  const e = auth.validarPinNuevo(pin, pin);
  if (e) volver("/admin/usuarios", { error: e });
  if (await auth.buscarPorEmail(email)) volver("/admin/usuarios", { error: "Ya existe ese correo." });
  await auth.crearUsuario({ rol, nombre, email, pin, celular: txt(fd, "celular", 30) });
  volver("/admin/usuarios", { ok: `Usuario ${email} creado. Entrégale el PIN por un canal privado.` });
}

export async function asignarPin(fd: FormData) {
  await auth.exigir("admin");
  const pin = txt(fd, "pin", 10);
  const e = auth.validarPinNuevo(pin, pin);
  if (e) volver("/admin/usuarios", { error: e });
  await auth.cambiarPin(txt(fd, "usuario_id", 40), pin);
  volver("/admin/usuarios", { ok: "PIN asignado y cuenta desbloqueada." });
}

export async function demo() {
  await auth.exigir("admin");
  let r;
  try {
    r = await cargarDemo();
  } catch (e) {
    volver("/admin", { error: e instanceof Error ? e.message : "No se pudieron cargar." });
  }
  revalidatePath("/", "layout");
  volver("/admin", { ok: `Datos de prueba cargados: ${r.eventos} eventos, ${r.usuarios} usuarios.` });
}
