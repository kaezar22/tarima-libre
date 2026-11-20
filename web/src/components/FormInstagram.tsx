import type { Fila } from "@/lib/config";
import { analizarInstagram } from "@/app/acciones/perfil";
import { BotonEnviar } from "./BotonEnviar";
import { PerfilIg } from "./PerfilIg";

export function FormInstagram({ actual, configurado, instagram }: { actual?: Fila; configurado: boolean; instagram?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] text-concreto">Analizamos <b>solo el texto</b> (tu bio y las descripciones de tus publicaciones) para identificar el tipo de eventos que promueves y tu público. El resultado aparece en tu perfil y ayuda a que te encuentren.</p>
      {actual && <PerfilIg p={actual} titulo="Tu último análisis" />}
      {!configurado ? (
        <p className="m-0 rounded-xl bg-gris-suave p-4 text-sm">El análisis aún no está disponible (falta configurar DeepSeek).</p>
      ) : (
        <form action={analizarInstagram} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 font-semibold">Tu cuenta<input name="cuenta" defaultValue={instagram} placeholder="@tucuenta" className="campo font-normal" /></label>
          <label className="flex flex-col gap-1.5 font-semibold">Pega tu bio y las descripciones de 5 a 15 publicaciones recientes
            <textarea name="texto" rows={8} required minLength={40} maxLength={12000} className="campo font-normal" /></label>
          <label className="flex items-start gap-3 text-[15px]"><input type="checkbox" name="autorizo" required className="mt-1 h-5 w-5 accent-[#EC6A24]" />
            <span>Autorizo que este texto se analice con DeepSeek (puede procesarse fuera de Colombia).</span></label>
          <BotonEnviar pendiente="Analizando…">{actual ? "Analizar de nuevo" : "Analizar"}</BotonEnviar>
        </form>
      )}
      <p className="m-0 text-xs text-gris">Pronto podrás conectar tu cuenta de Instagram directamente.</p>
    </div>
  );
}
