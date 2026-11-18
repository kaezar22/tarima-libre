"""Reglas del negocio sobre la capa de datos (sin UI)."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from config import DIAS_PUBLICAR_CALIFICACION, TIPOS_OFERTA
from core import db


def a_int(v, default=0) -> int:
    try:
        return int(float(str(v).replace(",", ".")))
    except (TypeError, ValueError):
        return default


def a_float(v, default=0.0) -> float:
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return default


def lista_generos(texto: str) -> list[str]:
    return [g.strip() for g in (texto or "").split(",") if g.strip()]


def a_fecha(texto: str) -> date | None:
    try:
        return datetime.strptime(texto[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Perfiles
# ---------------------------------------------------------------------------
def espacio_de_usuario(usuario_id: str) -> dict | None:
    r = db.filtrar("espacios", usuario_id=usuario_id)
    return r[0] if r else None


def promotor_de_usuario(usuario_id: str) -> dict | None:
    r = db.filtrar("promotores", usuario_id=usuario_id)
    return r[0] if r else None


# ---------------------------------------------------------------------------
# Ofertas
# ---------------------------------------------------------------------------
def ofertas_de(espacio_id: str, solo_activas: bool = True) -> list[dict]:
    return [o for o in db.filtrar("ofertas", espacio_id=espacio_id)
            if not solo_activas or o["activa"] == "SI"]


def texto_oferta(o: dict) -> str:
    etiqueta, unidad, _ = TIPOS_OFERTA.get(o["tipo"], (o["tipo"], "", False))
    valor = o["valor"]
    if unidad == "%":
        base = f"{etiqueta}: {valor}%"
    elif unidad == "COP":
        base = f"{etiqueta}: ${a_int(valor):,} COP".replace(",", ".")
    elif unidad and valor:
        base = f"{etiqueta}: {valor} {unidad}"
    else:
        base = etiqueta
    if o["condicion"]:
        base += f" — {o['condicion']}"
    return base


def comision_boleteria(espacio_id: str) -> float:
    """Mayor % de comisión sobre boletería del espacio (0 si no ofrece)."""
    vals = [a_float(o["valor"]) for o in ofertas_de(espacio_id) if o["tipo"] == "comision_boleteria"]
    return max(vals, default=0.0)


# ---------------------------------------------------------------------------
# Búsqueda
# ---------------------------------------------------------------------------
def buscar_espacios(ciudad: str = "", generos: list[str] | None = None, tipo: str = "",
                    cap_min: int = 0, cap_max: int = 0, tipos_oferta: list[str] | None = None,
                    comision_min: float = 0, solo_verificados: bool = True,
                    texto: str = "") -> list[dict]:
    generos = generos or []
    tipos_oferta = tipos_oferta or []
    texto = texto.strip().lower()
    todas_ofertas = [o for o in db.leer("ofertas") if o["activa"] == "SI"]
    por_espacio: dict[str, list[dict]] = {}
    for o in todas_ofertas:
        por_espacio.setdefault(o["espacio_id"], []).append(o)

    resultado = []
    for e in db.leer("espacios"):
        if solo_verificados and e["verificado"] != "SI":
            continue
        if ciudad and e["ciudad"] != ciudad:
            continue
        if tipo and e["tipo"] != tipo:
            continue
        cap = a_int(e["capacidad"])
        if cap_min and cap < cap_min:
            continue
        if cap_max and cap > cap_max:
            continue
        if generos and not set(generos) & set(lista_generos(e["generos"])):
            continue
        ofertas = por_espacio.get(e["espacio_id"], [])
        if tipos_oferta and not {o["tipo"] for o in ofertas} & set(tipos_oferta):
            continue
        comision = max((a_float(o["valor"]) for o in ofertas if o["tipo"] == "comision_boleteria"),
                       default=0.0)
        if comision_min and comision < comision_min:
            continue
        if texto and texto not in " ".join([e["nombre"], e["barrio"], e["descripcion"],
                                            e["generos"]]).lower():
            continue
        resultado.append({**e, "_ofertas": ofertas, "_comision": comision})
    return resultado


# ---------------------------------------------------------------------------
# Propuestas
# ---------------------------------------------------------------------------
def crear_propuesta(espacio_id: str, promotor_id: str, datos: dict) -> dict:
    return db.agregar("propuestas", {**datos, "espacio_id": espacio_id,
                                     "promotor_id": promotor_id, "estado": "PENDIENTE"})


def propuestas_de_espacio(espacio_id: str) -> list[dict]:
    return sorted(db.filtrar("propuestas", espacio_id=espacio_id),
                  key=lambda p: p["creado"], reverse=True)


def propuestas_de_promotor(promotor_id: str) -> list[dict]:
    return sorted(db.filtrar("propuestas", promotor_id=promotor_id),
                  key=lambda p: p["creado"], reverse=True)


def cambiar_estado(propuesta_id: str, estado: str, **extra) -> None:
    db.actualizar("propuestas", propuesta_id, {"estado": estado, **extra})


# ---------------------------------------------------------------------------
# Calificaciones y reputación
# ---------------------------------------------------------------------------
def ya_califico(propuesta_id: str, usuario_id: str) -> bool:
    return bool(db.filtrar("calificaciones", propuesta_id=propuesta_id, de_usuario_id=usuario_id))


def calificar(propuesta_id: str, de_usuario_id: str, a_tipo: str, a_id: str,
              puntajes: dict, observaciones: str) -> dict:
    if ya_califico(propuesta_id, de_usuario_id):
        raise ValueError("Ya calificaste este evento.")
    return db.agregar("calificaciones", {
        "propuesta_id": propuesta_id, "de_usuario_id": de_usuario_id,
        "a_tipo": a_tipo, "a_id": a_id,
        **{k: str(int(v)) for k, v in puntajes.items()},
        "observaciones": observaciones.strip(),
    })


def calificaciones_publicas(a_tipo: str, a_id: str) -> list[dict]:
    """Calificaciones visibles: ambas partes calificaron o pasaron N días del evento."""
    todas = db.leer("calificaciones")
    por_propuesta: dict[str, int] = {}
    for c in todas:
        por_propuesta[c["propuesta_id"]] = por_propuesta.get(c["propuesta_id"], 0) + 1
    propuestas = {p["propuesta_id"]: p for p in db.leer("propuestas")}
    limite = date.today() - timedelta(days=DIAS_PUBLICAR_CALIFICACION)
    visibles = []
    for c in todas:
        if c["a_tipo"] != a_tipo or c["a_id"] != a_id:
            continue
        p = propuestas.get(c["propuesta_id"], {})
        fecha = a_fecha(p.get("fecha_evento", ""))
        if por_propuesta[c["propuesta_id"]] >= 2 or (fecha and fecha <= limite):
            visibles.append({**c, "_fecha_evento": p.get("fecha_evento", ""),
                             "_evento": p.get("nombre_evento", "")})
    return sorted(visibles, key=lambda c: c["_fecha_evento"])


def reputacion(a_tipo: str, a_id: str) -> dict:
    """Resumen: promedios por dimensión + métricas objetivas de los eventos."""
    cals = calificaciones_publicas(a_tipo, a_id)
    dims = ["general", "cumplimiento", "comunicacion", "calidad"]
    promedios = {}
    for d in dims:
        vals = [a_int(c[d]) for c in cals if a_int(c[d])]
        promedios[d] = round(sum(vals) / len(vals), 2) if vals else None

    campo = "espacio_id" if a_tipo == "espacio" else "promotor_id"
    props = db.filtrar("propuestas", **{campo: a_id})
    aceptadas = [p for p in props if p["estado"] in ("ACEPTADA", "REALIZADA", "CANCELADA")]
    realizadas = [p for p in props if p["estado"] == "REALIZADA"]
    canceladas = [p for p in props if p["estado"] == "CANCELADA"]
    ratios = [a_int(p["asistentes_reales"]) / a_int(p["asistentes_estimados"])
              for p in realizadas
              if a_int(p["asistentes_estimados"]) and p["asistentes_reales"] != ""]
    return {
        "n": len(cals),
        "promedios": promedios,
        "calificaciones": cals,
        "eventos_realizados": len(realizadas),
        "eventos_cancelados": len(canceladas),
        "tasa_cumplimiento": (len(realizadas) / len(aceptadas)) if aceptadas else None,
        "asistencia_vs_estimado": (sum(ratios) / len(ratios)) if ratios else None,
        "asistentes_totales": sum(a_int(p["asistentes_reales"]) for p in realizadas),
    }
