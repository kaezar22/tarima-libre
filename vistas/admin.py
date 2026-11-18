"""Administración del beta: verificar espacios y gestionar usuarios."""
import pandas as pd
import streamlit as st

from config import PIN_LARGO, ROLES
from core import auth, db, demo, fotos, ig, modelo, ui
from vistas.acceso import _campo_pin, _validar_pin_nuevo


def verificar_espacios():
    u = ui.usuario()
    st.title("Verificar espacios")
    st.caption("Marca como verificado solo después de visitar el espacio.")
    espacios = db.leer("espacios", fresco=True)
    pendientes = [e for e in espacios if e["verificado"] != "SI"]
    verificados = [e for e in espacios if e["verificado"] == "SI"]
    usuarios = {x["usuario_id"]: x for x in db.leer("usuarios")}

    st.subheader(f"Pendientes ({len(pendientes)})")
    if not pendientes:
        st.caption("No hay espacios pendientes.")
    for e in pendientes:
        _tarjeta(e, u, usuarios.get(e["usuario_id"], {}), pendiente=True)

    with st.expander(f"Verificados ({len(verificados)})"):
        for e in verificados:
            _tarjeta(e, u, usuarios.get(e["usuario_id"], {}), pendiente=False)


def _tarjeta(e, admin, dueño, pendiente):
    with st.container(border=True):
        st.markdown(f"**{e['nombre']}** · {e['tipo']} · {e['barrio']}, {e['ciudad']} · "
                    f"cap. {e['capacidad']}")
        st.caption(f"📍 {e['direccion'] or 'sin dirección'} · Contacto: {dueño.get('nombre', '?')} "
                   f"· {dueño.get('email', '')} · {dueño.get('celular', '')}")
        st.caption(f"Géneros: {e['generos']} · Ofertas: "
                   f"{len(modelo.ofertas_de(e['espacio_id']))} · Fotos: {len(fotos.lista(e['fotos']))}")
        notas = st.text_area("Notas de la visita (solo admin)", e["notas_verificacion"],
                             key=f"notas_{e['espacio_id']}", height=70)
        if pendiente:
            if st.button("✅ Marcar verificado", key=f"ver_{e['espacio_id']}", type="primary"):
                db.actualizar("espacios", e["espacio_id"], {
                    "verificado": "SI", "verificado_por": admin["email"],
                    "verificado_fecha": db.ahora(), "notas_verificacion": notas})
                st.rerun()
        else:
            st.caption(f"Verificado por {e['verificado_por']} el {e['verificado_fecha']}")
            if st.button("Quitar verificación", key=f"unver_{e['espacio_id']}"):
                db.actualizar("espacios", e["espacio_id"], {"verificado": "NO",
                                                            "notas_verificacion": notas})
                st.rerun()


def usuarios():
    st.title("Usuarios")
    try:
        lista = db.leer("usuarios", fresco=True)
    except Exception as e:  # noqa: BLE001
        ui.error_conexion(e)
        return

    pendientes = [x for x in lista if x["estado"] == "PENDIENTE"]
    if pendientes:
        st.subheader(f"Solicitudes pendientes ({len(pendientes)})")
        for x in pendientes:
            with st.container(border=True):
                st.markdown(f"**{x['nombre']}** · {x['rol']} · {x['email']} · {x['celular']}")
                c1, c2 = st.columns(2)
                if c1.button("Aprobar", key=f"apr_{x['usuario_id']}", type="primary"):
                    db.actualizar("usuarios", x["usuario_id"], {"estado": "ACTIVO"})
                    st.rerun()
                if c2.button("Rechazar", key=f"rech_{x['usuario_id']}"):
                    db.actualizar("usuarios", x["usuario_id"], {"estado": "INACTIVO"})
                    st.rerun()

    st.subheader("Todos")
    df = pd.DataFrame([{k: x[k] for k in ("nombre", "rol", "email", "celular", "estado",
                                          "demo", "ultimo_ingreso", "bloqueado_hasta")}
                       for x in lista])
    st.dataframe(df, hide_index=True, width="stretch")

    c1, c2 = st.columns(2)
    with c1, st.container(border=True):
        st.markdown("**Crear usuario**")
        with st.form("crear_usuario", clear_on_submit=True):
            rol = st.selectbox("Rol", ROLES)
            nombre = st.text_input("Nombre")
            email = st.text_input("Correo")
            celular = st.text_input("Celular")
            pin = _campo_pin(f"PIN inicial ({PIN_LARGO} dígitos)", "adm_pin")
            st.caption("Entrégale el PIN a la persona por un canal privado; "
                       "puede cambiarlo en Mi perfil.")
            if st.form_submit_button("Crear", type="primary"):
                if not auth.email_valido(email) or len(nombre.strip()) < 2:
                    st.error("Revisa nombre y correo.")
                elif (msg := _validar_pin_nuevo(pin, pin)):
                    st.error(msg)
                elif auth.buscar_por_email(email):
                    st.error("Ya existe ese correo.")
                else:
                    auth.crear_usuario(rol, nombre, email, pin, celular=celular)
                    st.success(f"Usuario {email} creado.")

    with c2, st.container(border=True):
        st.markdown("**Cambiar PIN / desbloquear / estado**")
        opciones = {x["usuario_id"]: f"{x['nombre']} · {x['email']}" for x in lista}
        if opciones:
            uid = st.selectbox("Usuario", list(opciones), format_func=opciones.get)
            nuevo = _campo_pin("Nuevo PIN (opcional)", "adm_reset")
            if st.button("Asignar nuevo PIN"):
                if (msg := _validar_pin_nuevo(nuevo, nuevo)):
                    st.error(msg)
                else:
                    auth.cambiar_pin(uid, nuevo)
                    st.success("PIN actualizado y cuenta desbloqueada.")
            cA, cB = st.columns(2)
            if cA.button("Desbloquear"):
                auth.desbloquear(uid)
                st.success("Desbloqueado.")
            actual = next(x for x in lista if x["usuario_id"] == uid)
            nuevo_estado = "INACTIVO" if actual["estado"] == "ACTIVO" else "ACTIVO"
            if cB.button("Desactivar" if nuevo_estado == "INACTIVO" else "Activar"):
                db.actualizar("usuarios", uid, {"estado": nuevo_estado})
                st.rerun()


def sistema():
    st.title("Sistema")
    try:
        st.success(f"Conectado a {db.preparar_tablas()}")
    except Exception as e:  # noqa: BLE001
        ui.error_conexion(e)
        return
    st.markdown(
        f"- Fotos (Cloudinary): {'✅ configurado' if fotos.configurado() else '⚠️ sin configurar'}\n"
        f"- DeepSeek: {'✅ configurado' if ig.deepseek_configurado() else '⚠️ sin configurar'}\n"
        f"- Instagram OAuth: {'✅ configurado' if ig.oauth_configurado() else '— no configurado (se usa texto manual)'}")

    st.subheader("Datos de prueba")
    if demo.hay_datos_demo():
        st.caption(f"Cargados. Todos los usuarios de prueba entran con el PIN **{demo.PIN_DEMO}**.")
        st.code("\n".join(e["email"] for e in demo.ESPACIOS + demo.PROMOTORES))
    elif st.button("Cargar 5 espacios y 5 promotores de prueba"):
        st.success(f"Listo: {demo.cargar()}")
        st.rerun()

    st.subheader("Conteos")
    from config import TABLAS
    st.dataframe(pd.DataFrame([{"Tabla": t, "Filas": len(db.leer(t))} for t in TABLAS]),
                 hide_index=True)
