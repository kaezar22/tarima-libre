"""Prueba de humo en modo local (sin Google ni Cloudinary).

Uso:  python tests/prueba_humo.py
Borra _datos_local/ antes de empezar.
"""
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
shutil.rmtree(RAIZ / "_datos_local", ignore_errors=True)

from streamlit.testing.v1 import AppTest  # noqa: E402


def sin_errores(at, paso):
    errs = [e.value for e in at.exception]
    assert not errs, f"{paso}: {errs}"
    print(f"✓ {paso}")


# 1. Configuración inicial
at = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=60).run()
sin_errores(at, "pantalla de configuración inicial")
assert "configuración inicial" in at.title[0].value
at.text_input[0].input("Admin Prueba")
at.text_input[1].input("admin@prueba.co")
at.text_input[2].input("918273")
at.text_input[3].input("918273")
at.button[0].click().run()
sin_errores(at, "crear admin + datos demo")
assert at.session_state["usuario"]["rol"] == "admin"
assert any("Verificar espacios" in t.value for t in at.title), [t.value for t in at.title]

# 2. Login de promotor (app completa, sin sesión)
at = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=60).run()
sin_errores(at, "explorar sin sesión")
assert any("Bodega" in m.value for m in at.markdown), "no aparecen espacios"


def vista(fn_path, usuario_email, pin="482916", **qp):
    """Corre una vista con sesión iniciada."""
    def script(fn_path, usuario_email, pin, qp):
        import importlib
        import streamlit as st
        from core import auth
        if "usuario" not in st.session_state:
            estado, u = auth.ingresar(usuario_email, pin)
            assert estado == "OK", estado
            st.session_state["usuario"] = u
        for k, v in qp.items():
            st.query_params[k] = v
        mod, fn = fn_path.rsplit(".", 1)
        getattr(importlib.import_module(mod), fn)()
    a = AppTest.from_function(script, args=(fn_path, usuario_email, pin, qp), default_timeout=60)
    return a


import os  # noqa: E402
os.chdir(RAIZ)

# Login real por formulario
from core import auth  # noqa: E402
estado, _ = auth.ingresar("ruido.bogota@demo.tarima", "000001")
assert estado == "PIN_INCORRECTO", estado
estado, u_prom = auth.ingresar("ruido.bogota@demo.tarima", "482916")
assert estado == "OK"
print("✓ login con PIN (incorrecto y correcto)")
for _ in range(5):
    estado, _ = auth.ingresar("urbano.fest@demo.tarima", "111112")
assert estado == "BLOQUEADO", estado
estado, _ = auth.ingresar("urbano.fest@demo.tarima", "482916")
assert estado == "BLOQUEADO", "debería seguir bloqueado aunque el PIN sea correcto"
print("✓ bloqueo tras 5 intentos")

# 3. Promotor busca y abre ficha
a = vista("vistas.explorar.buscar", "ruido.bogota@demo.tarima").run()
sin_errores(a, "promotor: búsqueda")
assert any("Comisión sobre boletería" in m.value for m in a.markdown)
from core import db, modelo  # noqa: E402
bodega = [e for e in db.leer("espacios") if e["nombre"] == "La Bodega Sónica"][0]
a = vista("vistas.explorar.buscar", "ruido.bogota@demo.tarima", e=bodega["espacio_id"]).run()
sin_errores(a, "promotor: ficha de espacio con reputación")
a.text_input[0].input("Toque de prueba")
a.button[-1].click().run()
sin_errores(a, "promotor: enviar propuesta")
assert any("Propuesta enviada" in s.value for s in a.success)

# 4. Espacio acepta
a = vista("vistas.propuestas.recibidas", "bodega.sonica@demo.tarima").run()
sin_errores(a, "espacio: propuestas recibidas")
aceptar = [b for b in a.button if b.label == "Aceptar"]
assert aceptar, "no hay botón Aceptar"
aceptar[0].click().run()
sin_errores(a, "espacio: aceptar propuesta")
assert any(p["nombre_evento"] == "Toque de prueba" and p["estado"] == "ACEPTADA"
           for p in db.leer("propuestas", fresco=True))

# 5. Espacio califica un evento realizado pendiente (Jazz en el patio)
a = vista("vistas.propuestas.recibidas", "patio.lulo@demo.tarima").run()
a.segmented_control[0].set_value("Por calificar").run()
sin_errores(a, "espacio: filtro por calificar")
btn = [b for b in a.button if b.label == "Enviar calificación"]
assert btn, "no aparece formulario de calificación"
btn[0].click().run()
sin_errores(a, "espacio: calificar")

# 6. Mi espacio, perfil, directorio, admin
for fn, email in [("vistas.mi_espacio.mi_espacio", "casa.neon@demo.tarima"),
                  ("vistas.perfil.mi_perfil", "colectivo.pulso@demo.tarima"),
                  ("vistas.perfil.mi_perfil", "casa.neon@demo.tarima"),
                  ("vistas.promotores.directorio", "casa.neon@demo.tarima"),
                  ("vistas.propuestas.mis_propuestas", "ruido.bogota@demo.tarima"),
                  ("vistas.admin.verificar_espacios", "admin@prueba.co"),
                  ("vistas.admin.usuarios", "admin@prueba.co"),
                  ("vistas.admin.sistema", "admin@prueba.co")]:
    pin = "918273" if email.startswith("admin") else "482916"
    a = vista(fn, email, pin).run()
    sin_errores(a, f"{fn} ({email})")

# 7. Reputación
rep = modelo.reputacion("promotor", modelo.promotor_de_usuario(u_prom["usuario_id"])["promotor_id"])
assert rep["n"] == 2 and rep["promedios"]["general"] == 4.5, rep
print("✓ reputación calculada:", rep["promedios"], f"asistencia {rep['asistencia_vs_estimado']:.0%}")

# 8. Subir foto en modo local
from core import fotos  # noqa: E402
f = fotos.subir(b"\xff\xd8\xff" + b"0" * 100, bodega["espacio_id"])
assert f["url"].startswith("local:")
print("✓ foto local")
print("\nTODO OK")

# 9. Herramientas
for email in ("casa.neon@demo.tarima", "ruido.bogota@demo.tarima"):
    a = vista("vistas.herramientas.herramientas", email).run()
    sin_errores(a, f"herramientas ({email})")
a = vista("vistas.propuestas.mis_propuestas", "ruido.bogota@demo.tarima").run()
sin_errores(a, "propuesta aceptada con enlace a QR Eventos")
print("TODO OK 2")
