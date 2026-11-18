"""Ingreso, solicitud de acceso, configuración inicial y política."""
import streamlit as st

from config import APP_NAME, PIN_BLOQUEO_MINUTOS, PIN_LARGO, POLITICA_VERSION
from core import auth, db, demo
from core.politica import texto_politica


def politica_md() -> str:
    return texto_politica(responsable=db.secret("RESPONSABLE_NOMBRE", "Hayaku Lab"),
                          contacto=db.secret("RESPONSABLE_EMAIL", "[correo de contacto]"),
                          version=POLITICA_VERSION)


def _campo_pin(etiqueta: str, key: str) -> str:
    return st.text_input(etiqueta, type="password", max_chars=PIN_LARGO, key=key,
                         placeholder="•" * PIN_LARGO)


def _validar_pin_nuevo(pin: str, pin2: str) -> str | None:
    if not auth.pin_valido(pin):
        return f"El PIN debe tener exactamente {PIN_LARGO} dígitos."
    if auth.pin_debil(pin):
        return "Ese PIN es muy fácil de adivinar. Evita 123456, 000000 y similares."
    if pin != pin2:
        return "Los dos PIN no coinciden."
    return None


def ingresar():
    st.title(f"🎤 {APP_NAME}")
    st.caption("Ingresa con tu correo y tu PIN.")
    with st.form("login"):
        email = st.text_input("Correo")
        pin = _campo_pin(f"PIN ({PIN_LARGO} dígitos)", "login_pin")
        enviar = st.form_submit_button("Ingresar", type="primary", width="stretch")
    if not enviar:
        st.caption("¿No tienes cuenta? Ve a **Solicitar acceso** en el menú.")
        return
    try:
        estado, u = auth.ingresar(email, pin)
    except Exception as e:  # noqa: BLE001
        st.error(f"No pudimos verificar tus datos: {e}")
        return
    if estado == "OK":
        st.session_state["usuario"] = u
        st.rerun()
    elif estado == "BLOQUEADO":
        st.error(f"Demasiados intentos. Tu cuenta quedó bloqueada {PIN_BLOQUEO_MINUTOS} minutos.")
    elif estado == "PENDIENTE":
        st.warning("Tu solicitud aún no ha sido aprobada. Te avisaremos cuando esté activa.")
    elif estado == "INACTIVO":
        st.error("Esta cuenta está desactivada. Escríbenos si crees que es un error.")
    else:
        st.error("Correo o PIN incorrectos.")


def solicitar_acceso():
    st.title("Solicitar acceso al beta")
    st.write("Estamos en beta cerrado: revisamos cada solicitud y visitamos los espacios "
             "antes de publicarlos.")
    with st.form("solicitud"):
        rol = st.radio("Soy…", ["promotor", "espacio"], horizontal=True,
                       format_func=lambda r: {"promotor": "Promotor / artista",
                                              "espacio": "Espacio (bar, club, restaurante…)"}[r])
        nombre = st.text_input("Nombre (tuyo o de tu productora / espacio)")
        email = st.text_input("Correo")
        celular = st.text_input("Celular")
        pin = _campo_pin(f"Crea un PIN de {PIN_LARGO} dígitos", "sol_pin")
        pin2 = _campo_pin("Repite el PIN", "sol_pin2")
        with st.expander("Leer la política de tratamiento de datos"):
            st.markdown(politica_md())
        acepta = st.checkbox("Acepto la política de tratamiento de datos personales")
        enviar = st.form_submit_button("Enviar solicitud", type="primary")
    if not enviar:
        return
    errores = []
    if len(nombre.strip()) < 2:
        errores.append("Escribe tu nombre.")
    if not auth.email_valido(email):
        errores.append("Revisa el correo.")
    if (msg := _validar_pin_nuevo(pin, pin2)):
        errores.append(msg)
    if not acepta:
        errores.append("Debes aceptar la política de datos.")
    if not errores and auth.buscar_por_email(email):
        errores.append("Ya existe una cuenta con ese correo.")
    if errores:
        for e in errores:
            st.error(e)
        return
    auth.crear_usuario(rol, nombre, email, pin, celular=celular, estado="PENDIENTE",
                       acepta_politica="SI", version_politica=POLITICA_VERSION)
    st.success("¡Listo! Recibimos tu solicitud. Cuando la aprobemos podrás ingresar con tu correo y PIN.")


def configuracion_inicial():
    """Se muestra solo cuando no hay ningún usuario: crea el primer admin."""
    st.title(f"🎤 {APP_NAME} · configuración inicial")
    try:
        st.caption(f"Base de datos: {db.preparar_tablas()}")
    except Exception as e:  # noqa: BLE001
        st.error("No pudimos abrir la base de datos.")
        st.code(f"{type(e).__name__}: {e}")
        return
    st.write("No hay usuarios todavía. Crea la cuenta de administrador.")
    with st.form("setup"):
        nombre = st.text_input("Tu nombre")
        email = st.text_input("Tu correo")
        pin = _campo_pin(f"PIN de {PIN_LARGO} dígitos", "setup_pin")
        pin2 = _campo_pin("Repite el PIN", "setup_pin2")
        cargar_demo = st.checkbox("Cargar datos de prueba (5 espacios y 5 promotores)", value=True)
        enviar = st.form_submit_button("Crear administrador", type="primary")
    if not enviar:
        return
    if not auth.email_valido(email) or len(nombre.strip()) < 2:
        st.error("Revisa el nombre y el correo.")
        return
    if (msg := _validar_pin_nuevo(pin, pin2)):
        st.error(msg)
        return
    u = auth.crear_usuario("admin", nombre, email, pin, acepta_politica="SI",
                           version_politica=POLITICA_VERSION)
    if cargar_demo:
        demo.cargar()
    st.session_state["usuario"] = u
    st.session_state["setup_listo"] = cargar_demo
    st.rerun()


def privacidad():
    st.markdown(politica_md())
