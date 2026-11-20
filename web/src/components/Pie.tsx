import Link from "next/link";
import { LEMA } from "@/lib/config";

export function Pie() {
  return (
    <footer className="mt-10 border-t border-linea px-4 py-8 text-sm text-gris">
      <p className="m-0 font-semibold text-tinta">Tarima Libre · {LEMA}</p>
      <p className="m-0 pt-1">
        <a href="mailto:hello@tarimalibre.com" className="text-gris">hello@tarimalibre.com</a> ·{" "}
        <a href="https://instagram.com/tarima_libre" className="text-gris">@tarima_libre</a> ·{" "}
        <Link href="/privacidad" className="text-gris">Privacidad</Link>
      </p>
      <p className="m-0 pt-1 text-xs">Beta. Los datos marcados DEMO son ejemplos.</p>
    </footer>
  );
}
