import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth";
import * as db from "@/lib/db";
import { QR_PREFIJO } from "@/lib/config";
import { ahora } from "@/lib/fechas";

// Marca el ingreso de un registro de QR Eventos. Solo el espacio del evento o un admin.
export async function POST(req: Request) {
  const u = await usuarioActual();
  if (!u || !["espacio", "admin"].includes(u.rol)) return NextResponse.json({ estado: "NO_AUTORIZADO" }, { status: 401 });
  const { codigo, evento_id } = (await req.json().catch(() => ({}))) as { codigo?: string; evento_id?: string };
  const ev = evento_id ? await db.obtener("eventos", evento_id, true) : undefined;
  if (!ev) return NextResponse.json({ estado: "SIN_EVENTO" }, { status: 400 });
  if (u.rol === "espacio") {
    const esp = await db.obtener("espacios", ev.espacio_id);
    if (esp?.usuario_id !== u.usuario_id) return NextResponse.json({ estado: "NO_AUTORIZADO" }, { status: 403 });
  }
  const id = String(codigo || "").trim().replace(QR_PREFIJO, "").toLowerCase();
  const reg = id ? await db.obtener("registros", id, true) : undefined;
  if (!reg) return NextResponse.json({ estado: "NO_EXISTE" });
  const prom = await db.obtener("promotores", reg.promotor_id);
  const datos = { nombre: reg.nombre, promotor: prom?.nombre ?? "", hora: reg.checkin_hora };
  if (reg.evento_id !== ev.evento_id) return NextResponse.json({ estado: "OTRO_EVENTO", ...datos });
  if (reg.checkin === "SI") return NextResponse.json({ estado: "YA_INGRESO", ...datos });
  const hora = ahora();
  await db.actualizar("registros", reg.registro_id, { checkin: "SI", checkin_hora: hora });
  return NextResponse.json({ estado: "OK", ...datos, hora });
}

// Conteo en vivo por promotor
export async function GET(req: Request) {
  const u = await usuarioActual();
  if (!u || !["espacio", "admin"].includes(u.rol)) return NextResponse.json({}, { status: 401 });
  const eventoId = new URL(req.url).searchParams.get("evento_id") || "";
  const regs = await db.filtrar("registros", { evento_id: eventoId }, true);
  const proms = new Map((await db.leer("promotores")).map((p) => [p.promotor_id, p.nombre]));
  const conteo: Record<string, { promotor: string; registrados: number; ingresaron: number }> = {};
  for (const r of regs) {
    const c = (conteo[r.promotor_id] ??= { promotor: proms.get(r.promotor_id) ?? "?", registrados: 0, ingresaron: 0 });
    c.registrados++;
    if (r.checkin === "SI") c.ingresaron++;
  }
  return NextResponse.json({ conteo: Object.values(conteo) });
}
