"""Login con correo + PIN.

- El PIN se guarda como hash PBKDF2-SHA256 con sal aleatoria (nunca en claro).
- Tras PIN_MAX_INTENTOS fallidos la cuenta se bloquea PIN_BLOQUEO_MINUTOS.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from config import PIN_BLOQUEO_MINUTOS, PIN_LARGO, PIN_MAX_INTENTOS, TIMEZONE
from core import db

ITERACIONES = 200_000
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
_FMT = "%Y-%m-%d %H:%M:%S"


def hash_pin(pin: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt), ITERACIONES)
    return h.hex(), salt


def pin_valido(pin: str) -> bool:
    return bool(re.fullmatch(rf"\d{{{PIN_LARGO}}}", pin or ""))


def pin_debil(pin: str) -> bool:
    """Rechaza 000000, 123456, 654321 y similares."""
    if len(set(pin)) == 1:
        return True
    secuencia = "01234567890"
    return pin in secuencia or pin in secuencia[::-1]


def email_valido(email: str) -> bool:
    return bool(EMAIL_RE.match((email or "").strip()))


def _ahora() -> datetime:
    return datetime.now(ZoneInfo(TIMEZONE)).replace(tzinfo=None)


def buscar_por_email(email: str, fresco: bool = True) -> dict | None:
    email = (email or "").strip().lower()
    for u in db.leer("usuarios", fresco=fresco):
        if u["email"].strip().lower() == email:
            return u
    return None


def crear_usuario(rol: str, nombre: str, email: str, pin: str, celular: str = "",
                  estado: str = "ACTIVO", demo: bool = False,
                  acepta_politica: str = "", version_politica: str = "") -> dict:
    pin_hash, salt = hash_pin(pin)
    return db.agregar("usuarios", {
        "rol": rol,
        "nombre": nombre.strip(),
        "email": email.strip().lower(),
        "celular": celular,
        "pin_hash": pin_hash,
        "pin_salt": salt,
        "intentos_fallidos": "0",
        "bloqueado_hasta": "",
        "estado": estado,
        "acepta_politica": acepta_politica,
        "version_politica": version_politica,
        "demo": "SI" if demo else "",
    })


def cambiar_pin(usuario_id: str, pin: str) -> None:
    pin_hash, salt = hash_pin(pin)
    db.actualizar("usuarios", usuario_id, {"pin_hash": pin_hash, "pin_salt": salt,
                                           "intentos_fallidos": "0", "bloqueado_hasta": ""})


def desbloquear(usuario_id: str) -> None:
    db.actualizar("usuarios", usuario_id, {"intentos_fallidos": "0", "bloqueado_hasta": ""})


def ingresar(email: str, pin: str) -> tuple[str, dict | None]:
    """Devuelve (estado, usuario).

    estado: OK / NO_EXISTE / PIN_INCORRECTO / BLOQUEADO / PENDIENTE / INACTIVO
    Para no revelar qué correos existen, la UI debe mostrar el mismo mensaje
    para NO_EXISTE y PIN_INCORRECTO.
    """
    u = buscar_por_email(email)
    if u is None:
        hash_pin(pin or "0")  # mismo tiempo de respuesta que un correo existente
        return "NO_EXISTE", None

    if u["bloqueado_hasta"]:
        try:
            hasta = datetime.strptime(u["bloqueado_hasta"], _FMT)
        except ValueError:
            hasta = None
        if hasta and hasta > _ahora():
            return "BLOQUEADO", u

    calculado, _ = hash_pin(pin or "", u["pin_salt"])
    if not hmac.compare_digest(calculado, u["pin_hash"]):
        intentos = int(u["intentos_fallidos"] or 0) + 1
        cambios = {"intentos_fallidos": str(intentos)}
        if intentos >= PIN_MAX_INTENTOS:
            hasta = _ahora() + timedelta(minutes=PIN_BLOQUEO_MINUTOS)
            cambios = {"intentos_fallidos": "0", "bloqueado_hasta": hasta.strftime(_FMT)}
        db.actualizar("usuarios", u["usuario_id"], cambios)
        return ("BLOQUEADO" if "bloqueado_hasta" in cambios else "PIN_INCORRECTO"), u

    if u["estado"] == "PENDIENTE":
        return "PENDIENTE", u
    if u["estado"] != "ACTIVO":
        return "INACTIVO", u

    db.actualizar("usuarios", u["usuario_id"], {"intentos_fallidos": "0",
                                                "bloqueado_hasta": "",
                                                "ultimo_ingreso": db.ahora()})
    return "OK", u
