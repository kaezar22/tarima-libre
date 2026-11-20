export function Demo({ si = true, className = "" }: { si?: boolean | string; className?: string }) {
  if (!(si === true || si === "SI")) return null;
  return (
    <span className={`inline-flex items-center rounded bg-[#FFD43B] px-1.5 py-0.5 text-[10px] font-bold tracking-[.08em] text-tinta ${className}`}
      title="Dato de ejemplo">DEMO</span>
  );
}
