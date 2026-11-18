"""Capa de datos. TODO el acceso a la base pasa por aquí.

Hoy hay dos backends con la misma interfaz:
  - SheetsBackend: Google Sheets (cuando existe SPREADSHEET_ID en secrets).
  - LocalBackend:  archivos JSON en ./_datos_local (desarrollo sin internet).

Cuando el proyecto pase a Supabase, se agrega un SupabaseBackend con los
mismos tres métodos (leer, agregar, actualizar) y el resto de la app no cambia.
"""
from __future__ import annotations

import json
import secrets as _secrets
import threading
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import streamlit as st

from config import TABLAS, TIMEZONE

RAIZ = Path(__file__).resolve().parent.parent
LOCAL_KEY_FILE = RAIZ / "service_account.json"
LOCAL_DIR = RAIZ / "_datos_local"


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def ahora() -> str:
    return datetime.now(ZoneInfo(TIMEZONE)).strftime("%Y-%m-%d %H:%M:%S")


def nuevo_id() -> str:
    """ID corto, único y legible (12 caracteres hex)."""
    return _secrets.token_hex(6)


def secret(nombre: str, default=None):
    try:
        return st.secrets[nombre]
    except Exception:
        return default


def _id_col(tabla: str) -> str:
    return TABLAS[tabla][0]


# ---------------------------------------------------------------------------
# Backend Google Sheets
# ---------------------------------------------------------------------------
class SheetsBackend:
    nombre = "Google Sheets"

    def __init__(self, spreadsheet_id: str):
        import gspread
        from google.oauth2.service_account import Credentials

        self._gspread = gspread
        creds = Credentials.from_service_account_info(
            self._credenciales(), scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        self.sh = gspread.authorize(creds).open_by_key(spreadsheet_id)
        self._hojas: dict = {}

    @staticmethod
    def _credenciales() -> dict:
        tabla = secret("gcp_service_account")
        if tabla:
            return dict(tabla)
        texto = secret("GOOGLE_CREDENTIALS")
        if texto:
            return json.loads(texto)
        if LOCAL_KEY_FILE.exists():
            return json.loads(LOCAL_KEY_FILE.read_text(encoding="utf-8"))
        raise RuntimeError(
            "No hay credenciales de Google. Agrega [gcp_service_account] en "
            ".streamlit/secrets.toml o deja service_account.json en la raíz del repo."
        )

    def _hoja(self, tabla: str):
        if tabla in self._hojas:
            return self._hojas[tabla]
        columnas = TABLAS[tabla]
        try:
            ws = self.sh.worksheet(tabla)
        except self._gspread.WorksheetNotFound:
            ws = self.sh.add_worksheet(title=tabla, rows=500, cols=len(columnas))
            ws.update([columnas], "A1", value_input_option="RAW")
            ws.freeze(rows=1)
        else:
            encabezado = ws.row_values(1)
            if encabezado != columnas:
                if encabezado and columnas[: len(encabezado)] != encabezado:
                    raise RuntimeError(
                        f"La pestaña '{tabla}' tiene columnas distintas a las esperadas. "
                        "Solo se pueden agregar columnas nuevas al final."
                    )
                if ws.col_count < len(columnas):
                    ws.add_cols(len(columnas) - ws.col_count)
                ws.update([columnas], "A1", value_input_option="RAW")
                ws.freeze(rows=1)
        self._hojas[tabla] = ws
        return ws

    def leer(self, tabla: str) -> list[dict]:
        ws = self._hoja(tabla)
        cols = TABLAS[tabla]
        return ws.get_all_records(expected_headers=cols, default_blank="",
                                  value_render_option="UNFORMATTED_VALUE")

    def agregar(self, tabla: str, fila: dict) -> None:
        ws = self._hoja(tabla)
        # RAW: lo que escribe el usuario nunca se interpreta como fórmula.
        ws.append_row([_celda(fila.get(c, "")) for c in TABLAS[tabla]],
                      value_input_option="RAW")

    def agregar_varias(self, tabla: str, filas: list[dict]) -> None:
        if not filas:
            return
        ws = self._hoja(tabla)
        ws.append_rows([[_celda(f.get(c, "")) for c in TABLAS[tabla]] for f in filas],
                       value_input_option="RAW")

    def actualizar(self, tabla: str, id_valor: str, cambios: dict) -> bool:
        ws = self._hoja(tabla)
        cols = TABLAS[tabla]
        celda = ws.find(str(id_valor), in_column=1, case_sensitive=True)
        if celda is None:
            return False
        actual = ws.row_values(celda.row)
        actual += [""] * (len(cols) - len(actual))
        fila = dict(zip(cols, actual))
        fila.update(cambios)
        a1 = self._gspread.utils.rowcol_to_a1
        rango = f"{a1(celda.row, 1)}:{a1(celda.row, len(cols))}"
        ws.update([[_celda(fila[c]) for c in cols]], rango, value_input_option="RAW")
        return True


def _celda(v) -> str:
    if v is None:
        return ""
    return str(v)


# ---------------------------------------------------------------------------
# Backend local (JSON)
# ---------------------------------------------------------------------------
class LocalBackend:
    nombre = "Local (JSON)"
    _lock = threading.Lock()

    def __init__(self, carpeta: Path = LOCAL_DIR):
        self.carpeta = carpeta
        self.carpeta.mkdir(parents=True, exist_ok=True)

    def _ruta(self, tabla: str) -> Path:
        return self.carpeta / f"{tabla}.json"

    def leer(self, tabla: str) -> list[dict]:
        ruta = self._ruta(tabla)
        if not ruta.exists():
            return []
        filas = json.loads(ruta.read_text(encoding="utf-8"))
        cols = TABLAS[tabla]
        return [{c: f.get(c, "") for c in cols} for f in filas]

    def _guardar(self, tabla: str, filas: list[dict]) -> None:
        self._ruta(tabla).write_text(json.dumps(filas, ensure_ascii=False, indent=1),
                                     encoding="utf-8")

    def agregar(self, tabla: str, fila: dict) -> None:
        self.agregar_varias(tabla, [fila])

    def agregar_varias(self, tabla: str, filas: list[dict]) -> None:
        with self._lock:
            actuales = self.leer(tabla)
            actuales += [{c: _celda(f.get(c, "")) for c in TABLAS[tabla]} for f in filas]
            self._guardar(tabla, actuales)

    def actualizar(self, tabla: str, id_valor: str, cambios: dict) -> bool:
        idc = _id_col(tabla)
        with self._lock:
            filas = self.leer(tabla)
            for f in filas:
                if str(f[idc]) == str(id_valor):
                    f.update({k: _celda(v) for k, v in cambios.items()})
                    self._guardar(tabla, filas)
                    return True
        return False


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------
@st.cache_resource(show_spinner=False)
def backend():
    sid = secret("SPREADSHEET_ID")
    if sid:
        return SheetsBackend(sid)
    return LocalBackend()


def es_local() -> bool:
    return isinstance(backend(), LocalBackend)


@st.cache_data(ttl=60, show_spinner=False)
def _leer_cache(tabla: str) -> list[dict]:
    return backend().leer(tabla)


def leer(tabla: str, fresco: bool = False) -> list[dict]:
    """Filas de una tabla como dicts con TODOS los valores en texto."""
    if fresco:
        _leer_cache.clear()
    filas = _leer_cache(tabla)
    return [{k: ("" if v is None else str(v)) for k, v in f.items()} for f in filas]


def obtener(tabla: str, id_valor: str, fresco: bool = False) -> dict | None:
    idc = _id_col(tabla)
    for f in leer(tabla, fresco=fresco):
        if f[idc] == str(id_valor):
            return f
    return None


def filtrar(tabla: str, fresco: bool = False, **condiciones) -> list[dict]:
    return [f for f in leer(tabla, fresco=fresco)
            if all(f.get(k) == str(v) for k, v in condiciones.items())]


def agregar(tabla: str, fila: dict) -> dict:
    """Agrega una fila. Completa ID y fecha de creación si faltan."""
    fila = dict(fila)
    fila.setdefault(_id_col(tabla), nuevo_id())
    if "creado" in TABLAS[tabla]:
        fila.setdefault("creado", ahora())
    backend().agregar(tabla, fila)
    _leer_cache.clear()
    return fila


def agregar_varias(tabla: str, filas: list[dict]) -> None:
    listas = []
    for fila in filas:
        fila = dict(fila)
        fila.setdefault(_id_col(tabla), nuevo_id())
        if "creado" in TABLAS[tabla]:
            fila.setdefault("creado", ahora())
        listas.append(fila)
    backend().agregar_varias(tabla, listas)
    _leer_cache.clear()


def actualizar(tabla: str, id_valor: str, cambios: dict) -> bool:
    if "actualizado" in TABLAS[tabla]:
        cambios = {**cambios, "actualizado": ahora()}
    ok = backend().actualizar(tabla, id_valor, cambios)
    _leer_cache.clear()
    return ok


def preparar_tablas() -> str:
    """Crea las pestañas que falten. Devuelve el nombre del backend."""
    b = backend()
    if isinstance(b, SheetsBackend):
        for t in TABLAS:
            b._hoja(t)
        return f"{b.nombre}: {b.sh.title}"
    return b.nombre
