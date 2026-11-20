import { Aviso } from "./Aviso";

export function Mensajes({ sp }: { sp: { ok?: string; error?: string } }) {
  if (!sp.ok && !sp.error) return null;
  return <div className="px-4 pt-4">{sp.error ? <Aviso tipo="error">{sp.error}</Aviso> : <Aviso tipo="ok">{sp.ok}</Aviso>}</div>;
}
export type SP = Promise<Record<string, string | undefined>>;
