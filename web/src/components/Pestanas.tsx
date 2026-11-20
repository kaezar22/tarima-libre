import Link from "next/link";

export function Pestanas({ base, actual, items }: { base: string; actual: string; items: [string, string][] }) {
  return (
    <nav aria-label="Secciones" className="flex gap-1.5 overflow-x-auto px-4 pb-1 pt-3">
      {items.map(([k, t]) => (
        <Link key={k} href={`${base}?tab=${k}`} aria-current={actual === k ? "page" : undefined}
          className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold no-underline ${actual === k ? "bg-tinta text-crema" : "text-gris"}`}>{t}</Link>
      ))}
    </nav>
  );
}
