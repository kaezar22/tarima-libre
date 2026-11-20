import Image from "next/image";
import Link from "next/link";

export function Logo({ tamano = 36, texto = true }: { tamano?: number; texto?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 no-underline text-tinta" aria-label="Tarima Libre, inicio">
      <Image src="/brand/logo-mark.png" alt="" width={Math.round(tamano * 1.19)} height={tamano} priority />
      {texto && <span className="titulo text-[22px] tracking-tight">Tarima<span className="text-naranja-osc">Libre</span></span>}
    </Link>
  );
}
