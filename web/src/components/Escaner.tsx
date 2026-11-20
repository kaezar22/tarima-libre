"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type Resultado = { estado: string; nombre?: string; promotor?: string; hora?: string };
type Conteo = { promotor: string; registrados: number; ingresaron: number };

const MENSAJES: Record<string, [string, string]> = {
  OK: ["Ingreso registrado", "bg-[#E3F2E7] text-ok"],
  YA_INGRESO: ["Este QR ya había ingresado", "bg-[#FBE3DC] text-[#9A2B0C]"],
  OTRO_EVENTO: ["Este QR es de otro evento", "bg-[#FBE3DC] text-[#9A2B0C]"],
  NO_EXISTE: ["Código no reconocido", "bg-[#FBE3DC] text-[#9A2B0C]"],
};

export function Escaner({ eventos }: { eventos: { id: string; nombre: string }[] }) {
  const [evento, setEvento] = useState(eventos[0].id);
  const [activo, setActivo] = useState(false);
  const [camaras, setCamaras] = useState<{ id: string; label: string }[]>([]);
  const [camara, setCamara] = useState<string>("");
  const [res, setRes] = useState<Resultado | null>(null);
  const [conteo, setConteo] = useState<Conteo[]>([]);
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const lector = useRef<Html5Qrcode | null>(null);
  const ultimo = useRef<{ c: string; t: number }>({ c: "", t: 0 });

  const actualizarConteo = useCallback(async () => {
    const r = await fetch(`/api/checkin?evento_id=${evento}`);
    if (r.ok) setConteo((await r.json()).conteo ?? []);
  }, [evento]);

  useEffect(() => { actualizarConteo(); }, [actualizarConteo]);

  const enviar = useCallback(async (codigo: string) => {
    const ahora = Date.now();
    if (codigo === ultimo.current.c && ahora - ultimo.current.t < 4000) return; // evita lecturas dobles
    ultimo.current = { c: codigo, t: ahora };
    const r = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo, evento_id: evento }) });
    const d = (await r.json().catch(() => ({ estado: "ERROR" }))) as Resultado;
    setRes(d);
    if (navigator.vibrate) navigator.vibrate(d.estado === "OK" ? 80 : [80, 60, 80]);
    actualizarConteo();
  }, [evento, actualizarConteo]);

  async function iniciar() {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!camaras.length) {
        const cams = await Html5Qrcode.getCameras();
        setCamaras(cams.map((c) => ({ id: c.id, label: c.label })));
      }
      lector.current = new Html5Qrcode("lector-qr");
      await lector.current.start(camara ? { deviceId: { exact: camara } } : { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } }, (texto) => enviar(texto), () => {});
      setActivo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la cámara. Revisa los permisos del navegador.");
    }
  }

  async function detener() {
    try { await lector.current?.stop(); lector.current?.clear(); } catch { /* ya detenido */ }
    setActivo(false);
  }

  useEffect(() => () => { lector.current?.stop().catch(() => {}); }, []);

  const total = conteo.reduce((s, c) => s + c.ingresaron, 0);
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 font-semibold">Evento
        <select value={evento} onChange={(e) => { setEvento(e.target.value); setRes(null); }} className="campo font-normal">
          {eventos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </label>

      <div id="lector-qr" className={`overflow-hidden rounded-2xl bg-tinta ${activo ? "min-h-64" : "hidden"}`} />
      {camaras.length > 1 && (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Cámara
          <select value={camara} onChange={async (e) => { setCamara(e.target.value); if (activo) { await detener(); } }} className="campo font-normal">
            <option value="">Trasera (automática)</option>{camaras.map((c) => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
          </select>
        </label>
      )}
      {!activo ? <button className="btn btn-primario" onClick={iniciar}>Abrir cámara y escanear</button> : <button className="btn btn-borde" onClick={detener}>Detener cámara</button>}
      {error && <p role="alert" className="m-0 text-sm text-[#9A2B0C]">{error}</p>}

      {res && (
        <div role="status" aria-live="assertive" className={`rounded-2xl p-4 ${(MENSAJES[res.estado] ?? ["Error", "bg-gris-suave"])[1]}`}>
          <div className="titulo text-2xl">{(MENSAJES[res.estado] ?? ["No se pudo verificar"])[0]}</div>
          {res.nombre && <div className="text-[15px]">{res.nombre}{res.promotor && ` · invitado por ${res.promotor}`}</div>}
          {res.estado === "YA_INGRESO" && res.hora && <div className="text-sm">Ingresó a las {res.hora.slice(11, 16)}</div>}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { enviar(manual.trim()); setManual(""); } }} className="flex gap-2">
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Código manual" aria-label="Código manual" className="campo flex-1 uppercase" />
        <button className="btn btn-oscuro">Validar</button>
      </form>

      <section className="tarjeta flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between"><h2 className="titulo m-0 text-2xl">Asistencia</h2><span className="titulo text-3xl text-naranja-osc">{total}</span></div>
        {conteo.length === 0 && <p className="m-0 text-sm text-gris">Aún no hay registros con QR para este evento.</p>}
        {conteo.map((c) => (
          <div key={c.promotor} className="flex justify-between border-t border-linea pt-2 text-[15px]"><span>{c.promotor}</span><span><b>{c.ingresaron}</b> <span className="text-gris">/ {c.registrados} registrados</span></span></div>
        ))}
      </section>
    </div>
  );
}
