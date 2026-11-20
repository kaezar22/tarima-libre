import Link from "next/link";
export default function NoEncontrado() {
  return (
    <section className="flex flex-col gap-3 px-5 pt-10">
      <h1 className="titulo m-0 text-5xl">No encontramos esta página</h1>
      <p className="m-0 text-concreto">Puede que el enlace esté mal escrito o que el contenido ya no esté publicado.</p>
      <Link href="/" className="btn btn-primario self-start">Ir al inicio</Link>
    </section>
  );
}
