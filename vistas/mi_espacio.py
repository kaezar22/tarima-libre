"""El espacio edita sus datos, fotos y ofertas."""
import streamlit as st

from config import CIUDADES, GENEROS, MAX_FOTOS_ESPACIO, TIPOS_ESPACIO, TIPOS_OFERTA
from core import db, fotos, modelo, ui


def mi_espacio():
    u = ui.usuario()
    st.title("Mi espacio")
    esp = modelo.espacio_de_usuario(u["usuario_id"])

    if esp:
        if esp["verificado"] == "SI":
            st.success("✅ Espacio verificado y publicado.")
        else:
            st.info("⏳ Pendiente de verificación. Te visitaremos antes de publicarlo; "
                    "mientras tanto puedes completar tus datos, fotos y ofertas.")

    tab_datos, tab_fotos, tab_ofertas, tab_rep = st.tabs(
        ["Datos", "Fotos", "Ofertas y comisión", "Mi reputación"])
    with tab_datos:
        _datos(u, esp)
    if not esp:
        for t in (tab_fotos, tab_ofertas, tab_rep):
            t.caption("Guarda primero los datos del espacio.")
        return
    with tab_fotos:
        _fotos(esp)
    with tab_ofertas:
        _ofertas(esp)
    with tab_rep:
        ui.tarjeta_reputacion("espacio", esp["espacio_id"])


def _datos(u, esp):
    esp = esp or {}
    with st.form("datos_espacio"):
        nombre = st.text_input("Nombre del espacio", esp.get("nombre", u["nombre"]))
        c1, c2 = st.columns(2)
        tipo = c1.selectbox("Tipo", TIPOS_ESPACIO,
                            index=TIPOS_ESPACIO.index(esp["tipo"]) if esp.get("tipo") in TIPOS_ESPACIO else 0)
        capacidad = c2.number_input("Capacidad (personas)", 1, 10000,
                                    modelo.a_int(esp.get("capacidad"), 100) or 100, step=10)
        c3, c4 = st.columns(2)
        ciudad = c3.selectbox("Ciudad", CIUDADES,
                              index=CIUDADES.index(esp["ciudad"]) if esp.get("ciudad") in CIUDADES else 0)
        barrio = c4.text_input("Barrio / zona", esp.get("barrio", ""))
        direccion = st.text_input("Dirección (solo la ven los promotores)", esp.get("direccion", ""))
        generos = st.multiselect("Tipo de público / géneros", GENEROS,
                                 default=[g for g in modelo.lista_generos(esp.get("generos", ""))
                                          if g in GENEROS], placeholder="Elige…")
        descripcion = st.text_area("Descripción (tarima, sonido, horarios, permisos…)",
                                   esp.get("descripcion", ""), max_chars=1000)
        instagram = st.text_input("Instagram", esp.get("instagram", ""), placeholder="@tuespacio")
        guardar = st.form_submit_button("Guardar", type="primary")
    if not guardar:
        return
    if len(nombre.strip()) < 2 or not generos:
        st.error("Escribe el nombre y elige al menos un género.")
        return
    datos = dict(nombre=nombre.strip(), tipo=tipo, capacidad=int(capacidad), ciudad=ciudad,
                 barrio=barrio.strip(), direccion=direccion.strip(), generos=", ".join(generos),
                 descripcion=descripcion.strip(), instagram=_arroba(instagram))
    if esp.get("espacio_id"):
        db.actualizar("espacios", esp["espacio_id"], datos)
    else:
        db.agregar("espacios", {**datos, "usuario_id": u["usuario_id"], "verificado": "NO",
                                "fotos": "", "actualizado": db.ahora()})
    st.success("Datos guardados.")
    st.rerun()


def _arroba(texto: str) -> str:
    t = texto.strip().replace("https://www.instagram.com/", "").replace("https://instagram.com/", "")
    t = t.strip("/").lstrip("@")
    return f"@{t}" if t else ""


def _fotos(esp):
    lista = fotos.lista(esp["fotos"])
    st.caption(f"{len(lista)} de {MAX_FOTOS_ESPACIO} fotos. Muestra la tarima, la barra y el "
               "espacio lleno si tienes.")

    if lista:
        cols = st.columns(3)
        for i, f in enumerate(lista):
            with cols[i % 3]:
                src = fotos.miniatura(f, 500)
                if src:
                    st.image(src, width="stretch")
                if st.button("🗑 Quitar", key=f"del_{i}_{f['url'][-12:]}"):
                    fotos.borrar(f)
                    nueva = [x for x in lista if x is not f]
                    db.actualizar("espacios", esp["espacio_id"], {"fotos": fotos.a_texto(nueva)})
                    st.rerun()

    if len(lista) >= MAX_FOTOS_ESPACIO:
        st.info("Llegaste al máximo de fotos. Quita alguna para subir otra.")
        return
    if not fotos.configurado() and not db.es_local():
        st.warning("Falta configurar Cloudinary en los secrets para subir fotos.")
        return

    modo = st.segmented_control("Agregar foto", ["📁 Subir archivo", "📷 Usar cámara"],
                                default="📁 Subir archivo", key="modo_foto")
    archivos = []
    if modo == "📷 Usar cámara":
        foto = st.camera_input("Toma la foto", key="camara_espacio")
        if foto:
            archivos = [foto]
    else:
        subidos = st.file_uploader("Elige una o varias fotos", type=["jpg", "jpeg", "png", "webp"],
                                   accept_multiple_files=True, key="subir_espacio")
        archivos = list(subidos or [])

    if archivos and st.button(f"Guardar {len(archivos)} foto(s)", type="primary"):
        cupo = MAX_FOTOS_ESPACIO - len(lista)
        nuevas = []
        with st.spinner("Subiendo…"):
            for a in archivos[:cupo]:
                try:
                    nuevas.append(fotos.subir(a.getvalue(), esp["espacio_id"]))
                except Exception as e:  # noqa: BLE001
                    st.error(f"No se pudo subir {getattr(a, 'name', 'la foto')}: {e}")
        if nuevas:
            actual = fotos.lista(db.obtener("espacios", esp["espacio_id"], fresco=True)["fotos"])
            db.actualizar("espacios", esp["espacio_id"],
                          {"fotos": fotos.a_texto(actual + nuevas)})
            for k in ("subir_espacio", "camara_espacio"):
                st.session_state.pop(k, None)
            st.success(f"{len(nuevas)} foto(s) guardada(s).")
            st.rerun()
        if len(archivos) > cupo:
            st.warning(f"Solo se guardaron {cupo}: máximo {MAX_FOTOS_ESPACIO} fotos.")


def _ofertas(esp):
    st.caption("Lo que ofreces a promotores y a su público. Puedes combinar varias: "
               "por ejemplo 10% de la boletería + 3 pases gratis para el promotor.")
    ofertas = modelo.ofertas_de(esp["espacio_id"], solo_activas=False)
    for o in ofertas:
        c1, c2 = st.columns([5, 1])
        activa = o["activa"] == "SI"
        c1.markdown(("" if activa else "~~") + modelo.texto_oferta(o) + ("" if activa else "~~ (inactiva)"))
        if c2.button("Desactivar" if activa else "Activar", key=f"of_{o['oferta_id']}"):
            db.actualizar("ofertas", o["oferta_id"], {"activa": "NO" if activa else "SI"})
            st.rerun()
    if not ofertas:
        st.caption("Aún no tienes ofertas.")

    st.markdown("**Nueva oferta**")
    tipo = st.selectbox("Tipo", list(TIPOS_OFERTA), format_func=lambda t: TIPOS_OFERTA[t][0],
                        key="nueva_oferta_tipo")
    etiqueta, unidad, _ = TIPOS_OFERTA[tipo]
    with st.form("nueva_oferta", clear_on_submit=True):
        valor = 0
        if unidad == "%":
            valor = st.number_input("Porcentaje (%)", 1, 100, 10)
        elif unidad == "COP":
            valor = st.number_input("Valor (COP)", 0, 100_000_000, 10_000, step=1000)
        elif unidad:
            valor = st.number_input(f"Cantidad ({unidad})", 1, 1000, 2)
        condicion = st.text_input("Condiciones (opcional)",
                                  placeholder="Ej.: a partir de 100 boletas, solo jueves…")
        if st.form_submit_button("Agregar oferta", type="primary"):
            if tipo == "otro" and not condicion.strip():
                st.error("Describe el beneficio en Condiciones.")
            else:
                db.agregar("ofertas", {"espacio_id": esp["espacio_id"], "tipo": tipo,
                                       "valor": valor, "condicion": condicion.strip(),
                                       "activa": "SI"})
                st.rerun()
