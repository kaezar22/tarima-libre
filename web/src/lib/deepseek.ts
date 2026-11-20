// Clasificación del contenido de Instagram (solo texto) con DeepSeek.
import "server-only";
import { GENEROS } from "./config";

export const deepseekConfigurado = () => !!process.env.DEEPSEEK_API_KEY;
export const MAX_CARACTERES = 12_000;
export const MODELO = "deepseek-chat";

const PROMPT = `Eres analista de la escena musical y de eventos en Colombia.
Recibes el texto público de una cuenta de Instagram (bio y captions) de un espacio
(bar, club, restaurante), un promotor o un artista. Clasifica el tipo de eventos que promueve.

Responde SOLO un objeto JSON con estas claves:
- "generos": lista de 1 a 4 géneros, tomados de esta lista: ${GENEROS.join(", ")}
- "tipo_contenido": frase corta (p. ej. "agenda de conciertos en vivo", "fiestas de música electrónica")
- "publico": frase corta sobre el público (edad aproximada, estilo, zona si se menciona)
- "tono": 1 a 3 palabras
- "etiquetas": lista de 3 a 8 palabras clave
- "resumen": máximo 2 frases en español

Si el texto no alcanza para decidir algo, usa "sin datos suficientes". No inventes.`;

export type AnalisisIg = {
  generos: string[]; tipo_contenido: string; publico: string; tono: string; etiquetas: string[]; resumen: string;
};

export async function analizarTexto(texto: string, rol: string): Promise<AnalisisIg> {
  const clave = process.env.DEEPSEEK_API_KEY;
  if (!clave) throw new Error("El análisis no está configurado (falta DEEPSEEK_API_KEY).");
  const t = (texto || "").trim().slice(0, MAX_CARACTERES);
  if (t.length < 40) throw new Error("Hay muy poco texto para analizar: pega tu bio y varias publicaciones.");
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      messages: [{ role: "system", content: PROMPT }, { role: "user", content: `Tipo de cuenta: ${rol}\n\nTexto:\n${t}` }],
      response_format: { type: "json_object" }, temperature: 0.2, max_tokens: 600,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`DeepSeek respondió ${r.status}`);
  const d = JSON.parse((await r.json()).choices[0].message.content);
  const txt = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  return {
    generos: (Array.isArray(d.generos) ? d.generos : []).filter((g: string) => GENEROS.includes(g)),
    tipo_contenido: txt(d.tipo_contenido, 200), publico: txt(d.publico, 200), tono: txt(d.tono, 80),
    etiquetas: (Array.isArray(d.etiquetas) ? d.etiquetas : []).map((e: unknown) => txt(e, 40)).slice(0, 8),
    resumen: txt(d.resumen, 400),
  };
}
