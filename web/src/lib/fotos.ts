// Fotos de espacios en Cloudinary (solo servidor). En la hoja se guarda JSON [{url, public_id}].
import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { promises as fs } from "fs";
import path from "path";
import { esLocal, nuevoId } from "./db";

export type Foto = { url: string; public_id: string };

export const fotosConfiguradas = () => /^cloudinary:\/\/[^:]+:[^@]+@.+/.test(process.env.CLOUDINARY_URL || "");

export function listaFotos(v: string): Foto[] {
  try {
    const d = JSON.parse(v || "[]");
    return Array.isArray(d) ? d.filter((x) => x && x.url) : [];
  } catch {
    return [];
  }
}

export async function subirFoto(buf: Buffer, espacioId: string): Promise<Foto> {
  if (buf.length > 8 * 1024 * 1024) throw new Error("La foto pesa más de 8 MB.");
  if (fotosConfiguradas()) {
    cloudinary.config({ secure: true }); // lee CLOUDINARY_URL
    const r = await new Promise<{ secure_url: string; public_id: string }>((ok, mal) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `tarima_libre/espacios/${espacioId}`, resource_type: "image",
          transformation: [{ width: 1600, height: 1600, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
        },
        (err, res) => (err || !res ? mal(err ?? new Error("Sin respuesta de Cloudinary")) : ok(res)),
      ).end(buf);
    });
    return { url: r.secure_url, public_id: r.public_id };
  }
  if (!esLocal()) throw new Error("Falta configurar CLOUDINARY_URL para subir fotos.");
  const nombre = `${espacioId}_${nuevoId()}.jpg`;
  const dir = path.join(process.cwd(), "public", "_local_fotos");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, nombre), buf);
  return { url: `/_local_fotos/${nombre}`, public_id: "" };
}

export async function borrarFoto(f: Foto) {
  try {
    if (f.public_id && fotosConfiguradas()) {
      cloudinary.config({ secure: true });
      await cloudinary.uploader.destroy(f.public_id, { invalidate: true });
    }
  } catch {
    /* no interrumpe */
  }
}

/** Versión liviana para tarjetas. */
export function miniatura(url: string, ancho = 800): string {
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/c_fill,w_${ancho},h_${Math.round(ancho * 0.62)},q_auto,f_auto/`);
  }
  return url;
}

/** Cloudinary ya optimiza (y así no gastamos la cuota de imágenes de Vercel);
 * las fotos subidas en modo local no existen en el build. Las de /fotos sí se optimizan. */
export const sinOptimizar = (url: string) => url.startsWith("http") || url.startsWith("/_local");
