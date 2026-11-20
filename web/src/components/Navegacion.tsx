"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IcoBuscar, IcoCalendario, IcoCasa, IcoEscudo, IcoMegafono, IcoPersona, IcoPuerta, IcoQr } from "./Iconos";

const MENUS = {
  promotor: [
    { href: "/espacios", t: "Espacios", I: IcoBuscar },
    { href: "/eventos", t: "Eventos", I: IcoCalendario },
    { href: "/qr", t: "QR", I: IcoQr },
    { href: "/perfil", t: "Perfil", I: IcoPersona },
  ],
  espacio: [
    { href: "/mi-espacio", t: "Mi espacio", I: IcoCasa },
    { href: "/eventos", t: "Eventos", I: IcoCalendario },
    { href: "/promotores", t: "Promotores", I: IcoMegafono },
    { href: "/puerta", t: "Puerta", I: IcoPuerta },
    { href: "/perfil", t: "Perfil", I: IcoPersona },
  ],
  admin: [
    { href: "/admin", t: "Admin", I: IcoEscudo },
    { href: "/espacios", t: "Espacios", I: IcoBuscar },
    { href: "/eventos", t: "Eventos", I: IcoCalendario },
    { href: "/promotores", t: "Promotores", I: IcoMegafono },
    { href: "/perfil", t: "Perfil", I: IcoPersona },
  ],
} as const;

export function Navegacion({ rol }: { rol: keyof typeof MENUS }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Menú principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-papel/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl justify-around px-2">
        {MENUS[rol].map(({ href, t, I }) => {
          const activo = ruta === href || ruta.startsWith(href + "/");
          return (
            <Link key={href} href={href} aria-current={activo ? "page" : undefined}
              className={`flex min-w-[60px] flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold no-underline ${activo ? "text-naranja-osc" : "text-gris"}`}>
              <I size={22} />{t}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
