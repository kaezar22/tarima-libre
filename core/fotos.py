"""Fotos de los espacios en Cloudinary.

En la hoja solo se guarda un JSON con [{"url", "public_id"}].
Sin Cloudinary configurado (desarrollo local), las fotos se guardan en
./_datos_local/fotos y se muestran desde ahí.
"""
from __future__ import annotations

import io
import json

from core import db

CARPETA = "tarima_libre/espacios"
LOCAL_FOTOS = db.LOCAL_DIR / "fotos"
MAX_MB = 10


def configurado() -> bool:
    c = db.secret("cloudinary")
    return bool(c and c.get("cloud_name") and c.get("api_key") and c.get("api_secret"))


def _cloudinary():
    import cloudinary
    import cloudinary.uploader

    c = db.secret("cloudinary")
    cloudinary.config(cloud_name=c["cloud_name"], api_key=c["api_key"],
                      api_secret=c["api_secret"], secure=True)
    return cloudinary.uploader


def lista(valor: str) -> list[dict]:
    try:
        datos = json.loads(valor) if valor else []
        return [d for d in datos if isinstance(d, dict) and d.get("url")]
    except (ValueError, TypeError):
        return []


def a_texto(fotos: list[dict]) -> str:
    return json.dumps(fotos, ensure_ascii=False) if fotos else ""


def subir(contenido: bytes, espacio_id: str) -> dict:
    """Sube una imagen y devuelve {"url", "public_id"}."""
    if len(contenido) > MAX_MB * 1024 * 1024:
        raise ValueError(f"La foto pesa más de {MAX_MB} MB.")
    if configurado():
        r = _cloudinary().upload(
            io.BytesIO(contenido),
            folder=f"{CARPETA}/{espacio_id}",
            resource_type="image",
            # Reduce tamaño y peso al subir: máx. 1600 px, calidad automática.
            transformation=[{"width": 1600, "height": 1600, "crop": "limit"},
                            {"quality": "auto", "fetch_format": "auto"}],
        )
        return {"url": r["secure_url"], "public_id": r["public_id"]}
    if not db.es_local():
        raise RuntimeError("Falta configurar [cloudinary] en secrets para subir fotos.")
    LOCAL_FOTOS.mkdir(parents=True, exist_ok=True)
    nombre = f"{espacio_id}_{db.nuevo_id()}.jpg"
    (LOCAL_FOTOS / nombre).write_bytes(contenido)
    return {"url": f"local:{nombre}", "public_id": ""}


def borrar(foto: dict) -> None:
    """Borra la foto del almacenamiento. Si falla, no interrumpe."""
    try:
        if foto.get("public_id") and configurado():
            _cloudinary().destroy(foto["public_id"], invalidate=True)
        elif foto.get("url", "").startswith("local:"):
            (LOCAL_FOTOS / foto["url"][6:]).unlink(missing_ok=True)
    except Exception:
        pass


def para_mostrar(foto: dict):
    """Lo que acepta st.image: URL o ruta local."""
    url = foto.get("url", "")
    if url.startswith("local:"):
        ruta = LOCAL_FOTOS / url[6:]
        return str(ruta) if ruta.exists() else None
    return url or None


def miniatura(foto: dict, ancho: int = 600):
    """URL de Cloudinary redimensionada (más liviana para listados)."""
    url = foto.get("url", "")
    if "res.cloudinary.com" in url and "/upload/" in url:
        return url.replace("/upload/", f"/upload/c_fill,w_{ancho},h_{int(ancho*0.66)},q_auto,f_auto/", 1)
    return para_mostrar(foto)
