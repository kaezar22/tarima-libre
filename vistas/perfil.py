"""Mi perfil: datos, perfil de promotor, PIN y análisis de Instagram."""
import streamlit as st

from config import CIUDADES, GENEROS, PIN_LARGO
from core import auth, db, ig, modelo, ui
from vistas.acceso import _campo_pin, _validar_pin_nuevo
from vistas.mi_espacio import _arroba


def mi_perfil():
    u = ui.usuario()
    st.title("Mi perfil")
    tabs = ["Instagram", "Mis datos", "Cambiar PIN"]
    if u["rol"] == "promotor":
        tabs = ["Perfil de promotor", "Mi reputación"] + tabs
    pestañas = dict(zip(tabs, st.tabs(tabs)))

    if "Perfil de promotor" in pestañas:
        with pestañas["Perfil de promotor"]:
            _perfil_promotor(u)
        with pestañas["Mi reputación"]:
            prom = modelo.promotor_de_usuario(u["usuario_id"])
            if prom:
                ui.tarjeta_reputacion("promotor", prom["promotor_id"])
            else:
                st.caption("Completa tu perfil de promotor primero.")
    with pestañas["Instagram"]:
        _instagram(u)
    with pestañas["Mis datos"]:
        _datos(u)
    with pestañas["Cambiar PIN"]:
        _pin(u)


def _perfil_promotor(u):
    prom = modelo.promotor_de_usuario(u["usuario_id"]) or {}
    with st.form("perfil_promotor"):
        nombre = st.text_input("Nombre artístico / productora", prom.get("nombre", u["nombre"]))
        ciudad = st.selectbox("Ciudad", CIUDADES,
                              index=CIUDADES.index(prom["ciudad"]) if prom.get("ciudad") in CIUDADES else 0)
        generos = st.multiselect("Géneros que manejas", GENEROS,
                                 default=[g for g in modelo.lista_generos(prom.get("generos", ""))
                                          if g in GENEROS], placeholder="Elige…")
        descripcion = st.text_area("Cuéntale a los espacios qué haces", prom.get("descripcion", ""),
                                   max_chars=800)
        instagram = st.text_input("Instagram", prom.get("instagram", ""), placeholder="@tucuenta")
        if st.form_submit_button("Guardar", type="primary"):
            if len(nombre.strip()) < 2 or not generos:
                st.error("Escribe tu nombre y elige al menos un género.")
                return
            datos = dict(nombre=nombre.strip(), ciudad=ciudad, generos=", ".join(generos),
                         descripcion=descripcion.strip(), instagram=_arroba(instagram))
            if prom.get("promotor_id"):
                db.actualizar("promotores", prom["promotor_id"], datos)
            else:
                db.agregar("promotores", {**datos, "usuario_id": u["usuario_id"],
                                          "actualizado": db.ahora()})
            st.success("Perfil guardado.")


def _datos(u):
    with st.form("mis_datos"):
        nombre = st.text_input("Nombre", u["nombre"])
        celular = st.text_input("Celular", u["celular"])
        st.text_input("Correo", u["email"], disabled=True,
                      help="Para cambiar el correo escríbele al administrador.")
        if st.form_submit_button("Guardar"):
            db.actualizar("usuarios", u["usuario_id"], {"nombre": nombre.strip(),
                                                         "celular": celular.strip()})
            st.session_state["usuario"] = {**u, "nombre": nombre.strip(), "celular": celular.strip()}
            st.success("Datos guardados.")


def _pin(u):
    with st.form("cambiar_pin", clear_on_submit=True):
        actual = _campo_pin("PIN actual", "pin_actual")
        nuevo = _campo_pin(f"Nuevo PIN ({PIN_LARGO} dígitos)", "pin_nuevo")
        nuevo2 = _campo_pin("Repite el nuevo PIN", "pin_nuevo2")
        if st.form_submit_button("Cambiar PIN"):
            estado, _ = auth.ingresar(u["email"], actual)
            if estado != "OK":
                st.error("El PIN actual no es correcto." if estado != "BLOQUEADO"
                         else "Demasiados intentos: cuenta bloqueada temporalmente.")
                return
            if (msg := _validar_pin_nuevo(nuevo, nuevo2)):
                st.error(msg)
                return
            auth.cambiar_pin(u["usuario_id"], nuevo)
            st.success("PIN actualizado.")


# ---------------------------------------------------------------------------
# Instagram
# ---------------------------------------------------------------------------
def _instagram(u):
    st.caption("Analizamos **solo el texto** (bio y descripciones de tus publicaciones) para "
               "identificar el tipo de contenido y público que manejas. Lo usamos para mostrar "
               "tu perfil a espacios y promotores afines. No guardamos tu contraseña ni tu token.")
    actual = ig.ultimo_perfil(u["usuario_id"])
    if actual:
        with st.container(border=True):
            st.markdown(f"**Último análisis · {actual['instagram'] or 'texto manual'}**")
            ui.perfil_ig(actual)

    if not ig.deepseek_configurado():
        st.warning("El análisis no está disponible: falta DEEPSEEK_API_KEY en los secrets.")
        return

    if ig.oauth_configurado():
        st.markdown("**Opción 1 · Conectar mi cuenta** (Business o Creator)")
        st.link_button("Conectar Instagram", ig.url_autorizacion(u["usuario_id"]), type="primary")
        st.caption("Instagram te pedirá permiso. Al volver verás el resultado aquí.")
        st.markdown("**Opción 2 · Pegar el texto a mano**")

    with st.form("ig_manual"):
        cuenta = st.text_input("Tu cuenta", placeholder="@tucuenta")
        texto = st.text_area("Pega tu bio y las descripciones de 5 a 15 publicaciones recientes",
                             height=220, max_chars=ig.MAX_CARACTERES)
        autorizo = st.checkbox("Autorizo que este texto se analice con DeepSeek "
                               "(puede procesarse fuera de Colombia)")
        if st.form_submit_button("Analizar"):
            if not autorizo:
                st.error("Necesitamos tu autorización para analizar el texto.")
                return
            _analizar_y_guardar(u["usuario_id"], u["rol"], _arroba(cuenta), texto, "manual",
                                texto.count("\n") + 1)


def _analizar_y_guardar(usuario_id, rol, cuenta, texto, fuente, n):
    with st.spinner("Analizando con DeepSeek…"):
        try:
            res = ig.analizar_texto(texto, rol)
        except ValueError as e:
            st.error(str(e))
            return False
        except Exception as e:  # noqa: BLE001
            st.error(f"El análisis falló: {e}")
            return False
    ig.guardar_perfil(usuario_id, cuenta, fuente, res, n)
    st.success("¡Análisis listo!")
    st.rerun()
    return True


def procesar_callback_instagram() -> bool:
    """Si la URL trae ?code=&state= de Instagram, procesa y muestra el resultado.
    Devuelve True si manejó la petición (la app no debe dibujar nada más)."""
    qp = st.query_params
    if "state" not in qp or ("code" not in qp and "error" not in qp):
        return False
    st.title("Instagram")
    usuario_id = ig.leer_estado(qp.get("state", ""))
    if "error" in qp:
        st.warning("No se conectó la cuenta (cancelaste el permiso o hubo un error en Instagram).")
    elif not usuario_id:
        st.error("El enlace expiró o no es válido. Vuelve a intentarlo desde Mi perfil.")
    else:
        u = db.obtener("usuarios", usuario_id, fresco=True)
        try:
            with st.spinner("Leyendo tu cuenta y analizando…"):
                cuenta, texto, n = ig.leer_cuenta_con_codigo(qp["code"])
                res = ig.analizar_texto(texto, u["rol"] if u else "promotor")
            ig.guardar_perfil(usuario_id, cuenta, "oauth", res, n)
            st.success(f"Analizamos {cuenta} ({n} publicaciones).")
            ui.perfil_ig(ig.ultimo_perfil(usuario_id))
        except Exception as e:  # noqa: BLE001
            st.error(f"No pudimos leer la cuenta: {e}")
    if st.button("Volver a Tarima Libre", type="primary"):
        st.query_params.clear()
        st.rerun()
    return True
