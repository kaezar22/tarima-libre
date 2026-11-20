// Convierte service_account.json en una línea para GOOGLE_SERVICE_ACCOUNT_JSON (Vercel / .env.local).
// Uso:  node scripts/env-google.mjs ../service_account.json
import { readFileSync } from "fs";
const ruta = process.argv[2] || "../service_account.json";
const json = JSON.parse(readFileSync(ruta, "utf8"));
console.log(Buffer.from(JSON.stringify(json)).toString("base64"));
console.error(`\n✓ Copia la línea de arriba como valor de GOOGLE_SERVICE_ACCOUNT_JSON (${json.client_email}).`);
