"""Análisis del contenido de Instagram (solo texto) con DeepSeek.

Dos formas de obtener el texto, siempre con consentimiento del dueño de la cuenta:
  1. OAuth "Instagram API with Instagram Login" (cuentas Business/Creator).
     Requiere una app en developers.facebook.com y [instagram] en secrets.
     No se guarda el token: se usa una vez para leer bio y captions.
  2. Manual: el usuario pega su bio y algunos captions.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import urllib.parse

import requests

from config import GENEROS
from core import db

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODELO = "deepseek-chat"
IG_GRAPH = "https://graph.instagram.com/v21.0"
MAX_CAPTIONS = 30
MAX_CARACTERES = 12_000


# ---------------------------------------------------------------------------
# DeepSeek
# ---------------------------------------------------------------------------
def deepseek_configurado() -> bool:
    return bool(db.secret("DEEPSEEK_API_KEY"))


PROMPT_SISTEMA = f"""Eres analista de la escena musical y de eventos en Colombia.
Recibes el texto público de una cuenta de Instagram (bio y captions) de un espacio
(bar, club, restaurante), un promotor o un artista. Clasifica su contenido.

Responde SOLO un objeto JSON con estas claves:
- "generos": lista de 1 a 4 géneros, tomados de esta lista: {", ".join(GENEROS)}
- "tipo_contenido": frase corta (p. ej. "agenda de conciertos en vivo", "fiestas de música electrónica")
- "publico": frase corta sobre el público al que apunta (edad aproximada, estilo, zona si se menciona)
- "tono": 1 a 3 palabras (p. ej. "irreverente", "familiar", "exclusivo")
- "etiquetas": lista de 3 a 8 palabras clave útiles para búsquedas
- "resumen": máximo 2 frases en español

Si el texto no alcanza para decidir algo, usa "sin datos suficientes". No inventes."""


def analizar_texto(texto: str, rol: str) -> dict:
    """Llama a DeepSeek y devuelve el dict con la clasificación."""
    clave = db.secret("DEEPSEEK_API_KEY")
    if not clave:
        raise RuntimeError("Falta DEEPSEEK_API_KEY en secrets.")
    texto = (texto or "").strip()[:MAX_CARACTERES]
    if len(texto) < 40:
        raise ValueError("Hay muy poco texto para analizar (mínimo unas cuantas frases).")
    r = requests.post(
        DEEPSEEK_URL,
        headers={"Authorization": f"Bearer {clave}", "Content-Type": "application/json"},
        json={
            "model": DEEPSEEK_MODELO,
            "messages": [
                {"role": "system", "content": PROMPT_SISTEMA},
                {"role": "user", "content": f"Tipo de cuenta: {rol}\n\nTexto:\n{texto}"},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 600,
        },
        timeout=60,
    )
    r.raise_for_status()
    contenido = r.json()["choices"][0]["message"]["content"]
    datos = json.loads(contenido)
    generos = [g for g in datos.get("generos", []) if g in GENEROS]
    return {
        "generos": generos,
        "tipo_contenido": str(datos.get("tipo_contenido", ""))[:200],
        "publico": str(datos.get("publico", ""))[:200],
        "tono": str(datos.get("tono", ""))[:80],
        "etiquetas": [str(e)[:40] for e in datos.get("etiquetas", [])][:8],
        "resumen": str(datos.get("resumen", ""))[:400],
    }


def guardar_perfil(usuario_id: str, instagram: str, fuente: str, res: dict,
                   n_publicaciones: int) -> dict:
    return db.agregar("perfiles_ig", {
        "usuario_id": usuario_id,
        "instagram": instagram,
        "fuente": fuente,
        "generos": ", ".join(res["generos"]),
        "tipo_contenido": res["tipo_contenido"],
        "publico": res["publico"],
        "tono": res["tono"],
        "etiquetas": ", ".join(res["etiquetas"]),
        "resumen": res["resumen"],
        "publicaciones_analizadas": str(n_publicaciones),
        "modelo": DEEPSEEK_MODELO,
    })


def ultimo_perfil(usuario_id: str) -> dict | None:
    perfiles = db.filtrar("perfiles_ig", usuario_id=usuario_id)
    return perfiles[-1] if perfiles else None


# ---------------------------------------------------------------------------
# Instagram OAuth (opcional)
# ---------------------------------------------------------------------------
def _ig_conf() -> dict | None:
    c = db.secret("instagram")
    if c and c.get("app_id") and c.get("app_secret") and c.get("redirect_uri"):
        return dict(c)
    return None


def oauth_configurado() -> bool:
    return _ig_conf() is not None


def _clave_estado() -> bytes:
    c = _ig_conf() or {}
    return (c.get("app_secret", "") + "|tarima").encode()


def crear_estado(usuario_id: str) -> str:
    """'state' firmado: así sabemos a quién pertenece la cuenta al volver de Instagram
    (Streamlit abre una sesión nueva tras la redirección)."""
    datos = f"{usuario_id}.{int(time.time())}"
    firma = hmac.new(_clave_estado(), datos.encode(), hashlib.sha256).hexdigest()[:32]
    return base64.urlsafe_b64encode(f"{datos}.{firma}".encode()).decode().rstrip("=")


def leer_estado(estado: str, max_segundos: int = 900) -> str | None:
    try:
        relleno = "=" * (-len(estado) % 4)
        usuario_id, ts, firma = base64.urlsafe_b64decode(estado + relleno).decode().split(".")
    except Exception:
        return None
    esperado = hmac.new(_clave_estado(), f"{usuario_id}.{ts}".encode(),
                        hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(firma, esperado):
        return None
    if time.time() - int(ts) > max_segundos:
        return None
    return usuario_id


def url_autorizacion(usuario_id: str) -> str:
    c = _ig_conf()
    params = {
        "client_id": c["app_id"],
        "redirect_uri": c["redirect_uri"],
        "response_type": "code",
        "scope": "instagram_business_basic",
        "state": crear_estado(usuario_id),
    }
    return "https://www.instagram.com/oauth/authorize?" + urllib.parse.urlencode(params)


def leer_cuenta_con_codigo(codigo: str) -> tuple[str, str, int]:
    """Intercambia el código por un token y lee bio + captions.
    Devuelve (usuario_ig, texto, n_publicaciones). El token no se guarda."""
    c = _ig_conf()
    r = requests.post("https://api.instagram.com/oauth/access_token", data={
        "client_id": c["app_id"],
        "client_secret": c["app_secret"],
        "grant_type": "authorization_code",
        "redirect_uri": c["redirect_uri"],
        "code": codigo.split("#")[0],
    }, timeout=30)
    r.raise_for_status()
    datos = r.json()
    if "data" in datos and datos["data"]:
        datos = datos["data"][0]
    token = datos["access_token"]

    perfil = requests.get(f"{IG_GRAPH}/me", params={
        "fields": "username,name,biography", "access_token": token}, timeout=30)
    if perfil.status_code != 200:  # algunas cuentas no exponen biography
        perfil = requests.get(f"{IG_GRAPH}/me", params={
            "fields": "username,name", "access_token": token}, timeout=30)
    perfil.raise_for_status()
    p = perfil.json()

    media = requests.get(f"{IG_GRAPH}/me/media", params={
        "fields": "caption,timestamp", "limit": MAX_CAPTIONS, "access_token": token},
        timeout=30)
    media.raise_for_status()
    captions = [m["caption"] for m in media.json().get("data", []) if m.get("caption")]

    partes = [f"Nombre: {p.get('name', '')}", f"Bio: {p.get('biography', '')}", "Publicaciones:"]
    partes += [f"- {cap}" for cap in captions]
    return "@" + p.get("username", ""), "\n".join(partes), len(captions)
