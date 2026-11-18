"""Herramientas adicionales para promotores y espacios."""
import streamlit as st

from core import db, ui

QR_EVENTOS_DEFAULT = "https://qreventos.streamlit.app/"


def qr_eventos_url() -> str:
    return db.secret("QR_EVENTOS_URL", QR_EVENTOS_DEFAULT) or QR_EVENTOS_DEFAULT


def herramientas():
    u = ui.usuario()
    st.title("Herramientas")

    with st.container(border=True):
        st.subheader("🎟️ QR Eventos: cuenta cuánta gente trae cada artista")
        if u and u["rol"] == "espacio":
            st.write(
                "Pídele a cada artista o promotor que cree su invitación en QR Eventos. "
                "Sus seguidores se registran y reciben un QR personal; en la puerta lo escaneas "
                "y sabes exactamente cuántas personas llegaron por cada uno. "
                "Te sirve para pagar comisiones sin discusiones y para llenar los "
                "asistentes reales cuando marques el evento como realizado."
            )
        else:
            st.write(
                "Crea tu invitación para el evento y comparte el link o el QR con tus seguidores. "
                "Cada persona que se registra recibe un QR personal; en la puerta se escanea y "
                "queda contado a tu nombre. Así demuestras cuánta gente llevaste, cobras tu "
                "comisión y mejoras tu reputación en Tarima Libre."
            )
        st.markdown(
            "**Cómo se usa**\n"
            "1. Abre QR Eventos y llena los datos del artista y del evento.\n"
            "2. Comparte el link o el QR que te genera.\n"
            "3. El día del evento, la puerta escanea los QR personales.\n"
            "4. Al final, el conteo por artista sale en la página de puerta."
        )
        st.link_button("Abrir QR Eventos", qr_eventos_url(), type="primary")
        st.caption("Se abre en otra pestaña. Usa el mismo nombre del evento que pusiste "
                   "en la propuesta para que sea fácil cruzar los datos.")
