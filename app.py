"""Tarima Libre (beta) — promotores encuentran espacios para sus eventos.

Ejecutar:  streamlit run app.py
Sin SPREADSHEET_ID en secrets, trabaja en modo local (archivos en _datos_local/).
"""
import streamlit as st

from config import APP_NAME
from core import db, demo
from vistas import (acceso, admin, explorar, herramientas, mi_espacio, perfil, promotores,
                    propuestas)

st.set_page_config(page_title=APP_NAME, page_icon="🎤", layout="wide")


def _salir():
    st.session_state.pop("usuario", None)
    st.query_params.clear()


def main():
    # 1. Regreso desde Instagram (OAuth): se atiende antes que todo.
    if perfil.procesar_callback_instagram():
        return

    # 2. Primera vez: no hay usuarios -> crear administrador.
    try:
        hay_usuarios = bool(db.leer("usuarios"))
    except Exception as e:  # noqa: BLE001
        st.title(APP_NAME)
        st.error("No pudimos conectarnos con la base de datos.")
        st.code(f"{type(e).__name__}: {e}")
        return
    if not hay_usuarios:
        acceso.configuracion_inicial()
        return

    u = st.session_state.get("usuario")
    P = st.Page
    privacidad = P(acceso.privacidad, title="Privacidad", icon="🔒", url_path="privacidad")
    herr = P(herramientas.herramientas, title="Herramientas", icon="🧰", url_path="herramientas")

    if not u:
        paginas = [P(explorar.buscar, title="Explorar espacios", icon="🔎", default=True),
                   P(acceso.ingresar, title="Ingresar", icon="🔑", url_path="ingresar"),
                   P(acceso.solicitar_acceso, title="Solicitar acceso", icon="📝",
                     url_path="solicitar"),
                   privacidad]
    elif u["rol"] == "promotor":
        paginas = [P(explorar.buscar, title="Buscar espacios", icon="🔎", default=True),
                   P(propuestas.mis_propuestas, title="Mis propuestas", icon="📨",
                     url_path="propuestas"),
                   P(perfil.mi_perfil, title="Mi perfil", icon="👤", url_path="perfil"),
                   herr,
                   privacidad]
    elif u["rol"] == "espacio":
        paginas = [P(mi_espacio.mi_espacio, title="Mi espacio", icon="🏠", default=True),
                   P(propuestas.recibidas, title="Propuestas recibidas", icon="📨",
                     url_path="recibidas"),
                   P(promotores.directorio, title="Promotores", icon="📣", url_path="promotores"),
                   P(perfil.mi_perfil, title="Mi perfil", icon="👤", url_path="perfil"),
                   herr,
                   privacidad]
    else:  # admin
        paginas = {
            "Administración": [
                P(admin.verificar_espacios, title="Verificar espacios", icon="✅", default=True),
                P(admin.usuarios, title="Usuarios", icon="👥", url_path="usuarios"),
                P(admin.sistema, title="Sistema", icon="⚙️", url_path="sistema"),
            ],
            "Vista de la plataforma": [
                P(explorar.buscar, title="Espacios", icon="🔎", url_path="espacios"),
                P(promotores.directorio, title="Promotores", icon="📣", url_path="promotores"),
                P(perfil.mi_perfil, title="Mi perfil", icon="👤", url_path="perfil"),
                herr,
                privacidad,
            ],
        }

    with st.sidebar:
        st.markdown(f"## 🎤 {APP_NAME}")
        st.caption("Beta")
        if u:
            st.markdown(f"**{u['nombre']}**  \n{u['rol'].capitalize()} · {u['email']}")
            st.button("Salir", on_click=_salir)
        if db.es_local():
            st.warning("Modo local: los datos se guardan en _datos_local/ "
                       "(no hay SPREADSHEET_ID en secrets).")

    if st.session_state.pop("setup_listo", False):
        st.toast(f"Datos de prueba cargados. PIN de los usuarios demo: {demo.PIN_DEMO}", icon="🎉")

    st.navigation(paginas).run()


main()
