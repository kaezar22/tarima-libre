// Capa de datos. TODO acceso a la base pasa por aquí (solo servidor).
//
// Backends con la misma interfaz:
//   - Google Sheets (cuando hay SPREADSHEET_ID y GOOGLE_SERVICE_ACCOUNT_JSON)
//   - Local: archivos JSON en .datos_local/ (desarrollo)
// Al pasar a Supabase se reescribe solo este archivo.
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { TABLAS, type Fila, type Tabla } from "./config";
import { ahora } from "./fechas";

const TTL_MS = 20_000;

type Snapshot = Record<Tabla, Fila[]>;
type Cache = { snap: Snapshot | null; t: number; cargando: Promise<Snapshot> | null };
const g = globalThis as unknown as { __tlCache?: Cache };
const cache: Cache = (g.__tlCache ??= { snap: null, t: 0, cargando: null });

export const nuevoId = () => crypto.randomBytes(6).toString("hex");
const idCol = (t: Tabla) => TABLAS[t][0];
const tablas = Object.keys(TABLAS) as Tabla[];

export function esLocal(): boolean {
  return !process.env.SPREADSHEET_ID;
}

// ---------------------------------------------------------------------------
// Google Sheets (REST)
// ---------------------------------------------------------------------------
let tokenCache: { token: string; exp: number } | null = null;
function credenciales() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (raw && !raw.trim().startsWith("{")) raw = Buffer.from(raw, "base64").toString("utf8");
  if (!raw) throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_JSON");
  return JSON.parse(raw) as { client_email: string; private_key: string };
}

// Token OAuth del service account (JWT firmado con RS256, sin dependencias externas).
async function token(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const c = credenciales();
  const ahoraS = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const datos = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: c.client_email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: ahoraS, exp: ahoraS + 3600,
  })}`;
  const firma = crypto.createSign("RSA-SHA256").update(datos).sign(c.private_key.replace(/\\n/g, "\n"), "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${datos}.${firma}` }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`No se pudo autenticar con Google (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const d = (await r.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return d.access_token;
}

const BASE = () => `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}`;

async function sheets(ruta: string, init?: RequestInit) {
  const r = await fetch(`${BASE()}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Google Sheets ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const rangoTabla = (t: Tabla) => `${t}!A1:${colLetra(TABLAS[t].length)}`;
function colLetra(n: number): string {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

async function sheetsLeerTodo(): Promise<Snapshot> {
  const qs = tablas.map((t) => `ranges=${encodeURIComponent(rangoTabla(t))}`).join("&");
  let data: { valueRanges: { values?: string[][] }[] };
  try {
    data = await sheets(`/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE`);
  } catch (e) {
    if (String(e).includes("Unable to parse range")) {
      await prepararTablas();
      data = await sheets(`/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE`);
    } else throw e;
  }
  const snap = {} as Snapshot;
  tablas.forEach((t, i) => {
    const cols = TABLAS[t] as readonly string[];
    const filas = (data.valueRanges[i]?.values ?? []).slice(1);
    snap[t] = filas
      .filter((f) => f[0])
      .map((f) => Object.fromEntries(cols.map((c, j) => [c, f[j] ?? ""])));
  });
  return snap;
}

async function sheetsAgregar(t: Tabla, filas: Fila[]) {
  const cols = TABLAS[t] as readonly string[];
  await sheets(
    `/values/${encodeURIComponent(t + "!A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: filas.map((f) => cols.map((c) => f[c] ?? "")) }) },
  );
}

async function sheetsActualizar(t: Tabla, id: string, cambios: Fila): Promise<boolean> {
  const cols = TABLAS[t] as readonly string[];
  const data = await sheets(`/values/${encodeURIComponent(rangoTabla(t))}?valueRenderOption=FORMATTED_VALUE`);
  const valores: string[][] = data.values ?? [];
  const idx = valores.findIndex((f, i) => i > 0 && f[0] === id);
  if (idx < 0) return false;
  const actual = Object.fromEntries(cols.map((c, j) => [c, valores[idx][j] ?? ""]));
  const nueva = { ...actual, ...cambios };
  const fila = idx + 1;
  await sheets(
    `/values/${encodeURIComponent(`${t}!A${fila}:${colLetra(cols.length)}${fila}`)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: [cols.map((c) => nueva[c] ?? "")] }) },
  );
  return true;
}

export async function prepararTablas(): Promise<string> {
  if (esLocal()) return "Local (.datos_local)";
  const meta = await sheets(`?fields=properties.title,sheets.properties.title`);
  const existentes = new Set<string>(meta.sheets.map((s: { properties: { title: string } }) => s.properties.title));
  const faltan = tablas.filter((t) => !existentes.has(t));
  if (faltan.length) {
    await sheets(`:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: faltan.map((t) => ({
          addSheet: { properties: { title: t, gridProperties: { frozenRowCount: 1, columnCount: TABLAS[t].length } } },
        })),
      }),
    });
  }
  // Encabezados (también agrega columnas nuevas al final)
  await sheets(`/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: tablas.map((t) => ({ range: `${t}!A1`, values: [TABLAS[t] as readonly string[]] })),
    }),
  });
  return `Google Sheets: ${meta.properties.title}`;
}

// ---------------------------------------------------------------------------
// Local (JSON)
// ---------------------------------------------------------------------------
const DIR = path.join(process.cwd(), ".datos_local");
async function localLeerTodo(): Promise<Snapshot> {
  await fs.mkdir(DIR, { recursive: true });
  const snap = {} as Snapshot;
  for (const t of tablas) {
    try {
      snap[t] = JSON.parse(await fs.readFile(path.join(DIR, `${t}.json`), "utf8"));
    } catch {
      snap[t] = [];
    }
  }
  return snap;
}
async function localGuardar(t: Tabla, filas: Fila[]) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${t}.json`), JSON.stringify(filas, null, 1));
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export async function snapshot(fresco = false): Promise<Snapshot> {
  if (!fresco && cache.snap && Date.now() - cache.t < TTL_MS) return cache.snap;
  if (!fresco && cache.cargando) return cache.cargando;
  cache.cargando = (esLocal() ? localLeerTodo() : sheetsLeerTodo())
    .then((s) => { cache.snap = s; cache.t = Date.now(); return s; })
    .finally(() => { cache.cargando = null; });
  return cache.cargando;
}

export function invalidar() {
  cache.snap = null;
  cache.t = 0;
}

export async function leer(t: Tabla, fresco = false): Promise<Fila[]> {
  return (await snapshot(fresco))[t];
}

export async function obtener(t: Tabla, id: string, fresco = false): Promise<Fila | undefined> {
  const c = idCol(t);
  return (await leer(t, fresco)).find((f) => f[c] === id);
}

export async function filtrar(t: Tabla, cond: Partial<Fila>, fresco = false): Promise<Fila[]> {
  return (await leer(t, fresco)).filter((f) => Object.entries(cond).every(([k, v]) => f[k] === v));
}

function completar(t: Tabla, fila: Partial<Fila>): Fila {
  const cols = TABLAS[t] as readonly string[];
  const f: Fila = {};
  for (const c of cols) f[c] = fila[c] == null ? "" : String(fila[c]);
  if (!f[cols[0]]) f[cols[0]] = nuevoId();
  if (cols.includes("creado") && !f.creado) f.creado = ahora();
  return f;
}

export async function agregar(t: Tabla, fila: Partial<Fila>): Promise<Fila> {
  const [f] = await agregarVarias(t, [fila]);
  return f;
}

export async function agregarVarias(t: Tabla, filas: Partial<Fila>[]): Promise<Fila[]> {
  const completas = filas.map((f) => completar(t, f));
  if (!completas.length) return [];
  if (esLocal()) {
    const actuales = (await localLeerTodo())[t];
    await localGuardar(t, [...actuales, ...completas]);
  } else {
    await sheetsAgregar(t, completas);
  }
  invalidar();
  return completas;
}

export async function actualizar(t: Tabla, id: string, cambios: Partial<Fila>): Promise<boolean> {
  const c: Fila = {};
  for (const [k, v] of Object.entries(cambios)) c[k] = v == null ? "" : String(v);
  if ((TABLAS[t] as readonly string[]).includes("actualizado")) c.actualizado = ahora();
  let ok: boolean;
  if (esLocal()) {
    const filas = (await localLeerTodo())[t];
    const f = filas.find((x) => x[idCol(t)] === id);
    if (f) Object.assign(f, c);
    ok = !!f;
    if (ok) await localGuardar(t, filas);
  } else {
    ok = await sheetsActualizar(t, id, c);
  }
  invalidar();
  return ok;
}
