"use client";
import { useState } from "react";

export function Copiar({ texto, etiqueta = "Copiar link" }: { texto: string; etiqueta?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn btn-borde" onClick={async () => { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 2000); }}>
      {ok ? "¡Copiado!" : etiqueta}
    </button>
  );
}
