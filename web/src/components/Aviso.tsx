export function Aviso({ tipo = "info", children }: { tipo?: "info" | "ok" | "error"; children: React.ReactNode }) {
  const c = { info: "bg-gris-suave text-concreto", ok: "bg-[#E3F2E7] text-ok", error: "bg-[#FBE3DC] text-[#9A2B0C]" }[tipo];
  return <div role={tipo === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[15px] ${c}`}>{children}</div>;
}
