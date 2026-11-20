"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IcoCamara, IcoSubir } from "./Iconos";

// Reduce la imagen en el navegador (máx. 1600 px, JPEG) antes de subirla.
async function comprimir(f: File): Promise<Blob> {
  const bmp = await createImageBitmap(f).catch(() => null);
  if (!bmp) return f;
  const esc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((ok) => c.toBlob((b) => ok(b ?? f), "image/jpeg", 0.85));
}

export function SubirFotos({ cupo }: { cupo: number }) {
  const router = useRouter();
  const [estado, setEstado] = useState<string>("");
  const [error, setError] = useState<string>("");
  const archivo = useRef<HTMLInputElement>(null);
  const camara = useRef<HTMLInputElement>(null);

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const lista = Array.from(files).slice(0, cupo);
    for (let i = 0; i < lista.length; i++) {
      setEstado(`Subiendo ${i + 1} de ${lista.length}…`);
      const fd = new FormData();
      fd.append("foto", await comprimir(lista[i]), "foto.jpg");
      const r = await fetch("/api/fotos", { method: "POST", body: fd });
      if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? "No se pudo subir la foto."); break; }
    }
    if (files.length > cupo) setError(`Solo se subieron ${cupo}: máximo 6 fotos.`);
    setEstado("");
    if (archivo.current) archivo.current.value = "";
    if (camara.current) camara.current.value = "";
    router.refresh();
  }

  if (cupo <= 0) return <p className="m-0 text-sm text-gris">Llegaste al máximo de fotos. Quita alguna para subir otra.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primario" disabled={!!estado} onClick={() => archivo.current?.click()}><IcoSubir />Subir fotos</button>
        <button type="button" className="btn btn-borde" disabled={!!estado} onClick={() => camara.current?.click()}><IcoCamara />Tomar foto</button>
      </div>
      <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={(e) => subir(e.target.files)} />
      <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={(e) => subir(e.target.files)} />
      {estado && <p role="status" className="m-0 text-sm font-semibold">{estado}</p>}
      {error && <p role="alert" className="m-0 text-sm text-[#9A2B0C]">{error}</p>}
      <p className="m-0 text-xs text-gris">“Tomar foto” abre la cámara trasera del celular. Las fotos se reducen antes de subir.</p>
    </div>
  );
}
