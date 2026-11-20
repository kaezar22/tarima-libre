# Tarima Libre · web (Next.js)

Red creativa de escena y cultura. Promotores y artistas encuentran espacios con beneficios
claros; los espacios publican lo que ofrecen; cada evento queda en el historial con sus
promotores, artistas y asistentes verificados con **QR Eventos**, y ambas partes se califican.

Reemplaza el beta en Streamlit. Datos en **Google Sheets** (beta); al escalar se pasa a
Supabase reescribiendo solo `src/lib/db.ts`.

## Correr en tu PC

```bash
cd web
npm install
cp .env.example .env.local     # ya viene creado con SESSION_SECRET para desarrollo
npm run dev                    # http://localhost:3000
```

Sin `SPREADSHEET_ID` trabaja en **modo local** (`.datos_local/`). La primera vez abre
`/configurar`: creas el administrador y cargas los datos de prueba (5 espacios,
8 promotores/artistas y 30 eventos, todos marcados **DEMO**). PIN de los usuarios demo: **482916**
(correos en `/admin`).

## Conectar Google Sheets

1. Crea una hoja **nueva** (p. ej. `tarima-libre-v2`): el modelo cambió y no es compatible con
   la hoja del beta en Streamlit.
2. Compártela como **Editor** con `qr-eventos@qr-eventos-513811.iam.gserviceaccount.com`.
3. En `.env.local`: `SPREADSHEET_ID=<id de la hoja>` y
   `GOOGLE_SERVICE_ACCOUNT_JSON=` con la salida de `node scripts/env-google.mjs ../service_account.json`.
4. Abre la app: crea las pestañas sola y te lleva a `/configurar`.

## Publicar en Vercel (gratis) con tarimalibre.com

1. Sube el repo a GitHub (la carpeta `web/` va dentro de `tarima-libre`).
2. vercel.com → *Add New Project* → importa `kaezar22/tarima-libre` → **Root Directory: `web`**.
3. *Environment Variables*: copia las de `.env.example` con valores reales
   (`SESSION_SECRET` nuevo y largo, `NEXT_PUBLIC_BASE_URL=https://tarimalibre.com`,
   `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `CLOUDINARY_URL`, `DEEPSEEK_API_KEY`, SMTP).
4. *Settings → Domains*: agrega `tarimalibre.com` y `www.tarimalibre.com` y crea en tu
   proveedor de dominio los registros DNS que Vercel te indique.

El plan Hobby de Vercel es para uso no comercial; cuando Tarima Libre cobre, pasar a Pro.

## Estructura

```
src/lib/config.ts     tablas (= pestañas), catálogos, beneficios, dimensiones
src/lib/db.ts         ÚNICO acceso a datos (Sheets REST o JSON local), caché 20 s
src/lib/auth.ts       correo + PIN (PBKDF2, compatible con el beta), bloqueo, cookie firmada
src/lib/modelo.ts     eventos, visibilidad, reputación, búsqueda
src/lib/demo.ts       datos de prueba
src/lib/fotos.ts      Cloudinary · deepseek.ts Instagram · correo.ts SMTP · qr.ts
src/app/...           páginas; acciones/ = server actions; api/ = fotos y check-in
```

## Pestañas de la hoja

`usuarios` · `espacios` · `promotores` · `beneficios` · `eventos` · `evento_promotores` ·
`calificaciones` · `perfiles_ig` · `invitaciones` · `registros`

Una propuesta es un evento en estado `PENDIENTE` → `ACEPTADA` → `REALIZADA` (o
`RECHAZADA`/`CANCELADA`). Cada promotor del evento tiene su fila en `evento_promotores`
con asistentes prometidos y reales. Los reales salen de los check-ins de QR Eventos
(`registros`) o, si no se usó QR, de lo que escribe el espacio al cerrar el evento.

## Quién ve qué

| | Público | Promotor | Espacio | Admin |
|---|---|---|---|---|
| Eventos realizados | nombre y # asistentes | detalle completo | detalle completo | todo |
| Beneficios y dirección de espacios | no | sí | el suyo | sí |
| Propuestas | no | las suyas | las de su espacio | todas |
| Directorio de promotores | no | perfiles por enlace | sí | sí |

## Pendiente

- Conectar Instagram con la app de Meta (hoy: el usuario pega bio y captions).
- Notificaciones por correo de propuestas nuevas.
- Pagos de comisiones.
- Revisar la política de datos con un abogado.
