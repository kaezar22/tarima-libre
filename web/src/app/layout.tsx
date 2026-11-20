import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";
import { Logo } from "@/components/Logo";
import { Navegacion } from "@/components/Navegacion";
import { usuarioActual } from "@/lib/auth";
import { esLocal } from "@/lib/db";
import { APP_NAME, LEMA } from "@/lib/config";


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: { default: `${APP_NAME} · ${LEMA}`, template: `%s · ${APP_NAME}` },
  description: "Promotores y artistas encuentran espacios con beneficios claros. Espacios llenan sus noches con promotores que cumplen.",
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/apple-icon.png" },
  openGraph: { images: ["/brand/logo-concreto.jpg"], siteName: APP_NAME, locale: "es_CO" },
};
export const viewport: Viewport = { themeColor: "#F6F4ED", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let u = null;
  try { u = await usuarioActual(); } catch { u = null; }
  const iniciales = u?.nombre.split(/\s+/).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  return (
    <html lang="es">
      <body className="min-h-dvh bg-crema text-tinta antialiased">
        <header className="sticky top-0 z-20 border-b border-linea bg-crema/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
            <Logo tamano={34} />
            {u ? (
              <Link href="/perfil" aria-label={`Mi perfil: ${u.nombre}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-tinta text-sm font-bold text-crema no-underline">{iniciales}</Link>
            ) : (
              <Link href="/ingresar" className="btn btn-chico btn-oscuro">Ingresar</Link>
            )}
          </div>
          {esLocal() && <div className="bg-[#FFD43B] px-4 py-1 text-center text-xs font-semibold">Modo local: los datos se guardan en .datos_local/ (sin SPREADSHEET_ID)</div>}
        </header>
        <main className={`mx-auto max-w-2xl ${u ? "pb-28" : "pb-10"}`}>{children}</main>
        {u && <Navegacion rol={u.rol as "promotor" | "espacio" | "admin"} />}
      </body>
    </html>
  );
}
