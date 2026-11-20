"use server";
import { redirect } from "next/navigation";
import * as auth from "@/lib/auth";
import * as db from "@/lib/db";
import { cargarDemo } from "@/lib/demo";
import { PIN_BLOQUEO_MINUTOS, POLITICA_VERSION } from "@/lib/config";
import { txt, volver } from "./util";

export async function ingresar(fd: FormData) {
  const email = txt(fd, "email", 200), pin = txt(fd, "pin", 10);
  const destino = txt(fd, "destino", 200);
  const { estado, u } = await auth.verificar(email, pin);
  const q = `/ingresar?email=${encodeURIComponent(email)}`;
  if (estado === "OK" && u) {
    await auth.iniciarSesion(u.usuario_id);
    const inicio = u.rol === "espacio" ? "/mi-espacio" : u.rol === "admin" ? "/admin" : "/espacios";
    redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : inicio);
  }
  if (estado === "BLOQUEADO") volver(q, { error: `Demasiados intentos. La cuenta quedó bloqueada ${PIN_BLOQUEO_MINUTOS} minutos.` });
  if (estado === "PENDIENTE") volver(q, { error: "Tu solicitud aún no ha sido aprobada. Te avisaremos cuando esté activa." });
  if (estado === "INACTIVO") volver(q, { error: "Esta cuenta está desactivada. Escríbenos a hello@tarimalibre.com." });
  volver(q, { error: "Correo o PIN incorrectos." });
}

export async function salir() {
  await auth.cerrarSesion();
  redirect("/");
}

export async function solicitar(fd: FormData) {
  const rol = txt(fd, "rol") === "espacio" ? "espacio" : "promotor";
  const nombre = txt(fd, "nombre", 120), email = txt(fd, "email", 200), celular = txt(fd, "celular", 30);
  const pin = txt(fd, "pin", 10), pin2 = txt(fd, "pin2", 10);
  const q = `/solicitar?rol=${rol}&nombre=${encodeURIComponent(nombre)}&email=${encodeURIComponent(email)}&celular=${encodeURIComponent(celular)}`;
  if (nombre.length < 2) volver(q, { error: "Escribe tu nombre." });
  if (!auth.emailValido(email)) volver(q, { error: "Revisa el correo." });
  const e = auth.validarPinNuevo(pin, pin2);
  if (e) volver(q, { error: e });
  if (fd.get("acepta") !== "on") volver(q, { error: "Debes aceptar la política de datos." });
  if (await auth.buscarPorEmail(email)) volver(q, { error: "Ya existe una cuenta con ese correo." });
  await auth.crearUsuario({ rol, nombre, email, pin, celular, estado: "PENDIENTE", acepta_politica: "SI", version_politica: POLITICA_VERSION });
  volver("/solicitar", { ok: "¡Listo! Recibimos tu solicitud. Cuando la aprobemos podrás ingresar con tu correo y PIN." });
}

export async function configurar(fd: FormData) {
  if ((await db.leer("usuarios", true)).length) redirect("/ingresar");
  const nombre = txt(fd, "nombre", 120), email = txt(fd, "email", 200);
  const pin = txt(fd, "pin", 10), pin2 = txt(fd, "pin2", 10);
  if (nombre.length < 2 || !auth.emailValido(email)) volver("/configurar", { error: "Revisa el nombre y el correo." });
  const e = auth.validarPinNuevo(pin, pin2);
  if (e) volver("/configurar", { error: e });
  await db.prepararTablas();
  const u = await auth.crearUsuario({ rol: "admin", nombre, email, pin, acepta_politica: "SI", version_politica: POLITICA_VERSION });
  if (fd.get("demo") === "on") await cargarDemo();
  await auth.iniciarSesion(u.usuario_id);
  volver("/admin", { ok: fd.get("demo") === "on" ? "Administrador creado y datos de prueba cargados." : "Administrador creado." });
}
