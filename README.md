# Tarima Libre (beta)

Plataforma donde **promotores** encuentran **espacios** (bares, restaurantes, clubs) para sus
eventos. Los espacios publican capacidad, géneros, fotos y ofertas (comisión sobre boletería,
pases para el promotor, descuentos…). Ambas partes se califican después de cada evento y eso
alimenta una gráfica de reputación. El contenido de Instagram (solo texto) se clasifica con DeepSeek.

Beta sobre **Streamlit + Google Sheets**. Si el proyecto funciona, se migra a Supabase
reescribiendo solo `core/db.py`.

## Estructura

```
app.py                 navegación según el rol (promotor / espacio / admin / visitante)
config.py              tablas, columnas y catálogos (géneros, tipos de oferta…)
core/db.py             ÚNICO acceso a datos (Google Sheets o modo local JSON)
core/auth.py           login correo + PIN (hash PBKDF2, bloqueo tras 5 intentos)
core/modelo.py         reglas: búsqueda, propuestas, calificaciones, reputación
core/fotos.py          fotos en Cloudinary (subir archivo o cámara)
core/ig.py             DeepSeek + OAuth de Instagram (opcional)
core/demo.py           datos de prueba: 5 espacios, 5 promotores
core/ui.py             gráfica de reputación y componentes
vistas/                páginas
tests/prueba_humo.py   prueba de todo el flujo en modo local
```

## Pestañas de la hoja (= futuras tablas)

`usuarios` · `espacios` · `promotores` · `ofertas` · `propuestas` · `calificaciones` · `perfiles_ig`

La app las crea sola la primera vez. No cambies el orden de las columnas; si agregas
columnas, van al final (en `config.py` y en la hoja).

## Puesta en marcha

1. **Probar sin internet (modo local):**
   ```
   pip install -r requirements.txt
   streamlit run app.py
   ```
   Sin `SPREADSHEET_ID` los datos quedan en `_datos_local/`. La primera vez pide crear el
   administrador y ofrece cargar los datos de prueba.

2. **Conectar Google Sheets:**
   - Crea una hoja nueva llamada `tarima libre`.
   - Compártela como **Editor** con el service account de QR Eventos
     (`qr-eventos@qr-eventos-513811.iam.gserviceaccount.com` o el `client_email` de tu JSON).
   - Copia `service_account.json` de `qr_eventos` a esta carpeta.
   - Copia `.streamlit/secrets.toml.example` como `.streamlit/secrets.toml` y pon el
     `SPREADSHEET_ID`.

3. **Cloudinary (fotos):** en tu Dashboard de Cloudinary copia *Cloud name*, *API Key* y
   *API Secret* a la sección `[cloudinary]` de `secrets.toml`.

4. **DeepSeek:** pon tu `DEEPSEEK_API_KEY`.

5. **Publicar en Streamlit Cloud:** sube el repo a GitHub (privado), crea la app apuntando a
   `app.py`, corre `python make_cloud_secrets.py` y pega `cloud_secrets.toml` en
   *Settings > Secrets*.

## Usuarios de prueba

PIN de todos: **482916**

| Espacios | Promotores |
|---|---|
| bodega.sonica@demo.tarima | ruido.bogota@demo.tarima |
| casa.neon@demo.tarima | colectivo.pulso@demo.tarima |
| patio.lulo@demo.tarima | noches.clave@demo.tarima |
| galpon7@demo.tarima | laura.acusticos@demo.tarima |
| la.clave@demo.tarima | urbano.fest@demo.tarima |

Son ficticios. Para borrarlos, elimina en la hoja las filas con `demo = SI` (y sus espacios,
promotores, ofertas, propuestas y calificaciones).

## Reglas del beta

- **Acceso:** el admin crea usuarios o aprueba solicitudes (*Solicitar acceso*).
- **Espacios:** solo se publican después de la visita y de marcarlos como verificados.
- **Comisiones y dirección:** solo las ven promotores con sesión iniciada.
- **Propuestas:** el promotor propone → el espacio acepta/rechaza → desde el día del evento el
  espacio lo marca como *realizado* con los asistentes reales → ambos se califican.
- **Calificaciones:** se publican cuando ambas partes califican o a los 14 días (evita represalias).
  Reputación = promedio por dimensión + eventos realizados + asistencia real vs. prometida.
- **Instagram:** solo cuentas que el usuario conecta o texto que pega él mismo, con autorización
  explícita. Se analiza solo texto. No se guarda el token.

## Instagram OAuth (opcional)

1. En developers.facebook.com crea una app tipo *Business* y agrega el producto
   **Instagram API with Instagram Login**.
2. Registra como *redirect URI* la URL pública de la app (p. ej. `https://tarima-libre.streamlit.app/`).
3. Mientras la app esté en modo desarrollo, agrega como *testers* las cuentas que van a probar.
4. Pon `app_id`, `app_secret` y `redirect_uri` en `[instagram]` de los secrets.

Este flujo no se ha probado contra Instagram real; el análisis por texto pegado sí funciona sin él.

## Pendiente (fases siguientes)

- Integrar QR Eventos: que `asistentes_reales` salga de los check-ins (`invitacion_qr`).
- Pagos de comisión dentro de la plataforma.
- Notificaciones por correo de propuestas nuevas.
- Revisar la política de datos con un abogado antes de abrir al público.
