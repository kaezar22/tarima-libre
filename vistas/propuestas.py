"""Propuestas de eventos: enviadas (promotor) y recibidas (espacio)."""
from datetime import date

import streamlit as st

from config import DIMENSIONES, ESTADOS_PROPUESTA
from core import db, modelo, ui


def mis_propuestas():
    u = ui.usuario()
    st.title("Mis propuestas")
    prom = modelo.promotor_de_usuario(u["usuario_id"])
    if not prom:
        st.info("Completa tu perfil de promotor en **Mi perfil** para empezar.")
        return
    _listar(modelo.propuestas_de_promotor(prom["promotor_id"]), u, lado="promotor")


def recibidas():
    u = ui.usuario()
    st.title("Propuestas recibidas")
    esp = modelo.espacio_de_usuario(u["usuario_id"])
    if not esp:
        st.info("Primero registra tu espacio en **Mi espacio**.")
        return
    _listar(modelo.propuestas_de_espacio(esp["espacio_id"]), u, lado="espacio")


def _listar(props: list[dict], u: dict, lado: str):
    if not props:
        st.caption("No hay propuestas todavía.")
        return
    filtro = st.segmented_control(
        "Estado", ["Activas", "Por calificar", "Todas"], default="Activas")
    espacios = {e["espacio_id"]: e for e in db.leer("espacios")}
    promotores = {p["promotor_id"]: p for p in db.leer("promotores")}
    mostradas = 0
    for p in props:
        por_calificar = p["estado"] == "REALIZADA" and not modelo.ya_califico(
            p["propuesta_id"], u["usuario_id"])
        if filtro == "Activas" and p["estado"] not in ("PENDIENTE", "ACEPTADA") and not por_calificar:
            continue
        if filtro == "Por calificar" and not por_calificar:
            continue
        mostradas += 1
        _tarjeta(p, u, lado, espacios.get(p["espacio_id"], {}),
                 promotores.get(p["promotor_id"], {}), por_calificar)
    if not mostradas:
        st.caption("Nada en este filtro.")


def _tarjeta(p, u, lado, esp, prom, por_calificar):
    pid = p["propuesta_id"]
    contraparte = esp.get("nombre", "?") if lado == "promotor" else prom.get("nombre", "?")
    with st.container(border=True):
        st.markdown(f"**{p['nombre_evento']}** · {contraparte}  \n"
                    f"{ESTADOS_PROPUESTA.get(p['estado'], p['estado'])} · 📅 {p['fecha_evento']} · "
                    f"{p['genero']} · {p['asistentes_estimados']} asistentes estimados"
                    + (f" · {p['asistentes_reales']} reales" if p["asistentes_reales"] else ""))
        if p["mensaje"]:
            st.caption(f"Mensaje: {p['mensaje']}")
        if p["respuesta"]:
            st.caption(f"Respuesta del espacio: {p['respuesta']}")

        if lado == "espacio" and prom:
            with st.expander(f"Reputación de {prom['nombre']}"):
                ui.tarjeta_reputacion("promotor", prom["promotor_id"])

        fecha = modelo.a_fecha(p["fecha_evento"])
        if lado == "espacio" and p["estado"] == "PENDIENTE":
            resp = st.text_input("Respuesta (opcional)", key=f"resp_{pid}")
            c1, c2 = st.columns(2)
            if c1.button("Aceptar", key=f"ac_{pid}", type="primary"):
                modelo.cambiar_estado(pid, "ACEPTADA", respuesta=resp)
                st.rerun()
            if c2.button("Rechazar", key=f"re_{pid}"):
                modelo.cambiar_estado(pid, "RECHAZADA", respuesta=resp)
                st.rerun()

        if p["estado"] == "ACEPTADA":
            if lado == "espacio" and fecha and fecha <= date.today():
                with st.form(f"real_{pid}"):
                    reales = st.number_input("¿Cuántas personas llegaron por este promotor?",
                                             0, 10000, modelo.a_int(p["asistentes_estimados"]))
                    if st.form_submit_button("Marcar como realizado", type="primary"):
                        modelo.cambiar_estado(pid, "REALIZADA", asistentes_reales=int(reales))
                        st.rerun()
            elif lado == "espacio":
                st.caption("Podrás marcarlo como realizado desde el día del evento.")
            if st.button("Cancelar evento", key=f"can_{pid}"):
                modelo.cambiar_estado(pid, "CANCELADA")
                st.rerun()

        if lado == "promotor" and p["estado"] == "PENDIENTE":
            if st.button("Retirar propuesta", key=f"ret_{pid}"):
                modelo.cambiar_estado(pid, "CANCELADA", respuesta="Retirada por el promotor")
                st.rerun()

        if p["estado"] == "REALIZADA":
            if por_calificar:
                a_tipo = "espacio" if lado == "promotor" else "promotor"
                a_id = p["espacio_id"] if a_tipo == "espacio" else p["promotor_id"]
                _form_calificar(pid, u, a_tipo, a_id, contraparte)
            else:
                st.caption("✔ Ya calificaste este evento.")


def _form_calificar(pid, u, a_tipo, a_id, nombre):
    etiquetas = DIMENSIONES[a_tipo]
    with st.form(f"cal_{pid}"):
        st.markdown(f"**Califica a {nombre}**")
        st.caption("Tu calificación se publica cuando la otra parte también califique "
                   "o en 14 días. No se muestra tu nombre.")
        puntajes = {d: st.slider(et, 1, 5, 4, key=f"{pid}_{d}") for d, et in etiquetas.items()}
        obs = st.text_area("Observaciones (opcional)", max_chars=600)
        if st.form_submit_button("Enviar calificación", type="primary"):
            try:
                modelo.calificar(pid, u["usuario_id"], a_tipo, a_id, puntajes, obs)
            except ValueError as e:
                st.warning(str(e))
            else:
                st.success("¡Gracias por calificar!")
                st.rerun()
