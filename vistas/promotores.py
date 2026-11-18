"""Directorio de promotores (lo ven espacios y admin)."""
import streamlit as st

from config import GENEROS
from core import db, ig, modelo, ui


def directorio():
    st.title("Promotores")
    generos = st.multiselect("Filtrar por género", GENEROS, placeholder="Elige…")
    proms = db.leer("promotores")
    if generos:
        proms = [p for p in proms if set(generos) & set(modelo.lista_generos(p["generos"]))]
    reps = {p["promotor_id"]: modelo.reputacion("promotor", p["promotor_id"]) for p in proms}
    proms.sort(key=lambda p: reps[p["promotor_id"]]["promedios"]["general"] or 0, reverse=True)
    st.caption(f"{len(proms)} promotor(es)")
    for p in proms:
        rep = reps[p["promotor_id"]]
        with st.container(border=True):
            st.markdown(f"#### {p['nombre']}")
            st.caption(f"{p['ciudad']}" + (f" · {p['instagram']}" if p["instagram"] else ""))
            st.markdown(" ".join(f"`{g}`" for g in modelo.lista_generos(p["generos"])))
            if p["descripcion"]:
                st.write(p["descripcion"])
            st.markdown(f"**{ui.estrellas(rep['promedios']['general'])}** ({rep['n']}) · "
                        f"{rep['eventos_realizados']} evento(s) · "
                        f"{rep['asistentes_totales']} asistentes llevados")
            with st.expander("Ver reputación y contenido"):
                ui.tarjeta_reputacion("promotor", p["promotor_id"])
                st.markdown("**Contenido en Instagram**")
                ui.perfil_ig(ig.ultimo_perfil(p["usuario_id"]))
