import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { usuarioActual } from "@/lib/auth";
import * as db from "@/lib/db";
import { espacioDeUsuario } from "@/lib/modelo";
import { listaFotos, subirFoto } from "@/lib/fotos";
import { MAX_FOTOS_ESPACIO } from "@/lib/config";

export async function POST(req: Request) {
  const u = await usuarioActual();
  if (!u || u.rol !== "espacio") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const e = await espacioDeUsuario(u.usuario_id);
  if (!e) return NextResponse.json({ error: "Primero guarda los datos del espacio." }, { status: 400 });
  const fd = await req.formData();
  const archivo = fd.get("foto");
  if (!(archivo instanceof File) || !archivo.type.startsWith("image/")) return NextResponse.json({ error: "Archivo no válido." }, { status: 400 });
  const actuales = listaFotos((await db.obtener("espacios", e.espacio_id, true))?.fotos ?? "");
  if (actuales.length >= MAX_FOTOS_ESPACIO) return NextResponse.json({ error: `Máximo ${MAX_FOTOS_ESPACIO} fotos.` }, { status: 400 });
  try {
    const f = await subirFoto(Buffer.from(await archivo.arrayBuffer()), e.espacio_id);
    await db.actualizar("espacios", e.espacio_id, { fotos: JSON.stringify([...actuales, f]) });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, foto: f });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "No se pudo subir." }, { status: 500 });
  }
}
