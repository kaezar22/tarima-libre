export function Estrellas({ valor, n }: { valor: number | null; n?: number }) {
  if (valor == null) return <span className="text-sm text-gris">Sin calificaciones aún</span>;
  const llenas = Math.round(valor);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className="text-naranja-osc" aria-hidden="true">{"★".repeat(llenas)}{"☆".repeat(5 - llenas)}</span>
      <b>{valor.toFixed(1)}</b>
      {n != null && <span className="text-gris">({n})</span>}
      <span className="sr-only">{valor.toFixed(1)} de 5</span>
    </span>
  );
}
