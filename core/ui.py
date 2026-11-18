"""Componentes de interfaz reutilizables."""
from __future__ import annotations

import altair as alt
import pandas as pd
import streamlit as st

from config import DIMENSIONES
from core import fotos, modelo


def estrellas(valor: float | None) -> str:
    if valor is None:
        return "Sin calificaciones aún"
    llenas = int(round(valor))
    return "★" * llenas + "☆" * (5 - llenas) + f"  {valor:.1f}"


def usuario() -> dict | None:
    return st.session_state.get("usuario")


def error_conexion(e: Exception):
    st.error("No pudimos conectarnos con la base de datos. Intenta de nuevo en un momento.")
    with st.expander("Detalle técnico"):
        st.code(f"{type(e).__name__}: {e}")


def galeria(lista: list[dict], columnas: int = 3, ancho: int = 600):
    if not lista:
        st.caption("Sin fotos todavía.")
        return
    cols = st.columns(columnas)
    for i, f in enumerate(lista):
        src = fotos.miniatura(f, ancho)
        if src:
            cols[i % columnas].image(src, width="stretch")


def tarjeta_reputacion(a_tipo: str, a_id: str, compacta: bool = False):
    """Gráfica de reputación: promedio por dimensión + evolución + métricas."""
    rep = modelo.reputacion(a_tipo, a_id)
    etiquetas = DIMENSIONES[a_tipo]
    general = rep["promedios"]["general"]

    if compacta:
        st.markdown(f"**{estrellas(general)}** · {rep['n']} calificación(es) · "
                    f"{rep['eventos_realizados']} evento(s) realizados")
        return

    c1, c2, c3 = st.columns(3)
    c1.metric("Calificación general", f"{general:.1f} / 5" if general else "—",
              help=f"{rep['n']} calificación(es) publicadas")
    c2.metric("Eventos realizados", rep["eventos_realizados"],
              help=f"Cancelados: {rep['eventos_cancelados']}")
    if a_tipo == "promotor":
        av = rep["asistencia_vs_estimado"]
        c3.metric("Asistencia vs. prometida", f"{av:.0%}" if av is not None else "—",
                  help="Promedio de asistentes reales / asistentes estimados en sus eventos")
    else:
        tc = rep["tasa_cumplimiento"]
        c3.metric("Eventos aceptados que se hicieron", f"{tc:.0%}" if tc is not None else "—")

    if not rep["n"]:
        st.caption("Aún no hay calificaciones publicadas. Se publican cuando ambas partes "
                   "califican el evento o pasan 14 días.")
        return

    df = pd.DataFrame([
        {"Dimensión": etiquetas[d], "Promedio": v}
        for d, v in rep["promedios"].items() if v is not None
    ])
    barras = (
        alt.Chart(df)
        .mark_bar(cornerRadiusEnd=4, height=18)
        .encode(
            x=alt.X("Promedio:Q", scale=alt.Scale(domain=[0, 5]), title=None,
                    axis=alt.Axis(values=[0, 1, 2, 3, 4, 5], grid=True)),
            y=alt.Y("Dimensión:N", sort=list(etiquetas.values()), title=None,
                    axis=alt.Axis(labelLimit=260)),
            tooltip=["Dimensión", alt.Tooltip("Promedio:Q", format=".1f")],
        )
        .properties(height=36 * len(df))
    )
    texto = barras.mark_text(align="left", dx=4).encode(text=alt.Text("Promedio:Q", format=".1f"))
    st.altair_chart(barras + texto, width="stretch")

    cals = rep["calificaciones"]
    if len(cals) >= 2:
        hist = pd.DataFrame([{"Fecha": c["_fecha_evento"], "Evento": c["_evento"],
                              "General": modelo.a_int(c["general"])} for c in cals])
        hist["Fecha"] = pd.to_datetime(hist["Fecha"], errors="coerce")
        linea = (
            alt.Chart(hist.dropna())
            .mark_line(point=True)
            .encode(
                x=alt.X("Fecha:T", title=None),
                y=alt.Y("General:Q", scale=alt.Scale(domain=[0, 5]), title="General"),
                tooltip=["Evento", alt.Tooltip("Fecha:T", format="%Y-%m-%d"), "General"],
            )
            .properties(height=160, title="Evolución por evento")
        )
        st.altair_chart(linea, width="stretch")

    observaciones = [c for c in reversed(cals) if c["observaciones"]]
    if observaciones:
        with st.expander(f"Observaciones ({len(observaciones)})"):
            for c in observaciones:
                st.markdown(f"**{c['_evento'] or 'Evento'}** · {c['_fecha_evento']} · "
                            f"{'★' * modelo.a_int(c['general'])}")
                st.write(c["observaciones"])
                st.divider()


def perfil_ig(perfil: dict | None):
    if not perfil:
        st.caption("Sin análisis de Instagram.")
        return
    st.markdown(f"**Contenido:** {perfil['tipo_contenido']}  \n"
                f"**Géneros detectados:** {perfil['generos'] or '—'}  \n"
                f"**Público:** {perfil['publico']}  \n"
                f"**Tono:** {perfil['tono']}")
    if perfil["resumen"]:
        st.caption(perfil["resumen"])
    if perfil["etiquetas"]:
        st.caption(" · ".join(f"#{e.strip().replace(' ', '')}" for e in perfil["etiquetas"].split(",")))
    st.caption(f"Analizado el {perfil['creado'][:10]} ({perfil['fuente']}, "
               f"{perfil['publicaciones_analizadas']} publicaciones).")
