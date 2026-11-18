"""Búsqueda de espacios y ficha de cada espacio."""
from datetime import date, timedelta

import streamlit as st

from config import CIUDADES, GENEROS, TIPOS_ESPACIO, TIPOS_OFERTA
from core import db, fotos, ig, modelo, ui


def _puede_ver_ofertas(u: dict | None) -> bool:
    return bool(u and u["rol"] in ("promotor", "admin"))


def buscar():
    u = ui.usuario()
    eid = st.query_params.get("e")
    if eid:
        ficha(eid)
        return

    st.title("Buscar espacios")
    ver_ofertas = _puede_ver_ofertas(u)

    with st.container(border=True):
        c1, c2, c3 = st.columns([1, 2, 1])
        ciudad = c1.selectbox("Ciudad", ["Todas"] + CIUDADES, index=1)
        generos = c2.multiselect("Género / tipo de evento", GENEROS, placeholder="Todos")
        tipo = c3.selectbox("Tipo de espacio", ["Todos"] + TIPOS_ESPACIO)
        c4, c5, c6 = st.columns([1, 2, 1])
        texto = c4.text_input("Buscar por nombre o barrio")
        cap = c5.slider("Capacidad (personas)", 0, 1000, (0, 1000), step=10)
        orden = c6.selectbox("Ordenar por", ["Reputación", "Comisión boletería", "Capacidad"]
                             if ver_ofertas else ["Reputación", "Capacidad"])
        tipos_oferta, comision_min = [], 0
        if ver_ofertas:
            c7, c8 = st.columns([2, 1])
            tipos_oferta = c7.multiselect(
                "Que ofrezca…", list(TIPOS_OFERTA),
                format_func=lambda t: TIPOS_OFERTA[t][0], placeholder="Elige…")
            comision_min = c8.number_input("Comisión boletería mínima (%)", 0, 100, 0, step=5)
        solo_verif = True
        if u and u["rol"] == "admin":
            solo_verif = st.toggle("Solo verificados", value=True)

    try:
        res = modelo.buscar_espacios(
            ciudad="" if ciudad == "Todas" else ciudad, generos=generos,
            tipo="" if tipo == "Todos" else tipo, cap_min=cap[0],
            cap_max=0 if cap[1] >= 1000 else cap[1], tipos_oferta=tipos_oferta,
            comision_min=comision_min, solo_verificados=solo_verif, texto=texto)
    except Exception as e:  # noqa: BLE001
        ui.error_conexion(e)
        return

    reps = {e["espacio_id"]: modelo.reputacion("espacio", e["espacio_id"]) for e in res}
    if orden == "Reputación":
        res.sort(key=lambda e: (reps[e["espacio_id"]]["promedios"]["general"] or 0), reverse=True)
    elif orden == "Comisión boletería":
        res.sort(key=lambda e: e["_comision"], reverse=True)
    else:
        res.sort(key=lambda e: modelo.a_int(e["capacidad"]), reverse=True)

    st.caption(f"{len(res)} espacio(s) encontrados")
    if not ver_ofertas:
        st.info("Ingresa como **promotor** para ver comisiones y beneficios de cada espacio.")

    for e in res:
        rep = reps[e["espacio_id"]]
        with st.container(border=True):
            cf, ci = st.columns([1, 2])
            lista = fotos.lista(e["fotos"])
            if lista and (src := fotos.miniatura(lista[0], 500)):
                cf.image(src, width="stretch")
            else:
                cf.markdown("### 🎤")
            verif = " ✅" if e["verificado"] == "SI" else " ⏳ sin verificar"
            ci.markdown(f"#### {e['nombre']}{verif}")
            ci.caption(f"{e['tipo']} · {e['barrio']}, {e['ciudad']} · "
                       f"capacidad {modelo.a_int(e['capacidad'])} personas")
            ci.markdown(" ".join(f"`{g}`" for g in modelo.lista_generos(e["generos"])))
            ci.markdown(f"**{ui.estrellas(rep['promedios']['general'])}** "
                        f"({rep['n']}) · {rep['eventos_realizados']} evento(s)")
            if ver_ofertas and e["_ofertas"]:
                ci.markdown("\n".join(f"- {modelo.texto_oferta(o)}" for o in e["_ofertas"][:3]))
            if ci.button("Ver espacio", key=f"ver_{e['espacio_id']}"):
                st.query_params["e"] = e["espacio_id"]
                st.rerun()


def ficha(espacio_id: str):
    u = ui.usuario()
    e = db.obtener("espacios", espacio_id)
    if st.button("← Volver a la búsqueda"):
        del st.query_params["e"]
        st.rerun()
    if not e or (e["verificado"] != "SI" and not (u and u["rol"] == "admin")):
        st.warning("Este espacio no existe o aún no está publicado.")
        return

    st.title(e["nombre"] + (" ✅" if e["verificado"] == "SI" else ""))
    st.caption(f"{e['tipo']} · {e['barrio']}, {e['ciudad']} · capacidad "
               f"{modelo.a_int(e['capacidad'])} personas"
               + (f" · {e['instagram']}" if e["instagram"] else ""))
    st.markdown(" ".join(f"`{g}`" for g in modelo.lista_generos(e["generos"])))
    if e["descripcion"]:
        st.write(e["descripcion"])
    ui.galeria(fotos.lista(e["fotos"]))

    st.subheader("Lo que ofrece")
    if _puede_ver_ofertas(u):
        ofertas = modelo.ofertas_de(espacio_id)
        if ofertas:
            st.markdown("\n".join(f"- {modelo.texto_oferta(o)}" for o in ofertas))
        else:
            st.caption("Este espacio aún no publica ofertas.")
        if e["direccion"]:
            st.caption(f"📍 {e['direccion']}")
    else:
        st.info("Ingresa como promotor para ver comisiones, beneficios y dirección.")

    st.subheader("Reputación")
    ui.tarjeta_reputacion("espacio", espacio_id)

    st.subheader("Contenido en Instagram")
    ui.perfil_ig(ig.ultimo_perfil(e["usuario_id"]))

    if u and u["rol"] == "promotor":
        st.subheader("Proponer un evento")
        formulario_propuesta(e, u)


def formulario_propuesta(e: dict, u: dict):
    prom = modelo.promotor_de_usuario(u["usuario_id"])
    if not prom:
        st.warning("Completa tu perfil de promotor en **Mi perfil** antes de enviar propuestas.")
        return
    with st.form(f"prop_{e['espacio_id']}", clear_on_submit=True):
        nombre = st.text_input("Nombre del evento")
        c1, c2, c3 = st.columns(3)
        fecha = c1.date_input("Fecha", min_value=date.today(),
                              value=date.today() + timedelta(days=14))
        genero = c2.selectbox("Género", GENEROS)
        estimados = c3.number_input("Asistentes que esperas traer", 1, 5000, 50, step=10)
        mensaje = st.text_area("Mensaje para el espacio",
                               placeholder="Cuéntales del line-up, horario, necesidades técnicas…")
        enviar = st.form_submit_button("Enviar propuesta", type="primary")
    if enviar:
        if len(nombre.strip()) < 3:
            st.error("Ponle un nombre al evento.")
            return
        if estimados > modelo.a_int(e["capacidad"]) > 0:
            st.warning("Ojo: esperas más gente que la capacidad del espacio.")
        modelo.crear_propuesta(e["espacio_id"], prom["promotor_id"], {
            "nombre_evento": nombre.strip(), "fecha_evento": fecha.isoformat(),
            "genero": genero, "asistentes_estimados": int(estimados), "mensaje": mensaje.strip()})
        st.success("Propuesta enviada. La verás en **Mis propuestas**.")
