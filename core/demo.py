"""Datos de prueba: 5 espacios y 5 promotores ficticios en Bogotá,
con ofertas, propuestas y calificaciones para que se vea la reputación."""
from __future__ import annotations

from datetime import date, timedelta

from config import POLITICA_VERSION
from core import auth, db

PIN_DEMO = "482916"

ESPACIOS = [
    dict(email="bodega.sonica@demo.tarima", nombre="La Bodega Sónica", tipo="Bar",
         barrio="Chapinero", capacidad=180, generos="Rock, Indie, Punk",
         descripcion="Bar de rock con tarima propia, backline básico y sonido para bandas de 4-5 integrantes.",
         instagram="@bodegasonica.demo",
         ofertas=[("comision_boleteria", 10, "Sobre boletas vendidas con el link del promotor"),
                  ("pases_promotor", 3, ""),
                  ("descuento_publico", 15, "En cerveza nacional antes de las 10 p.m.")]),
    dict(email="casa.neon@demo.tarima", nombre="Casa Neón", tipo="Club / discoteca",
         barrio="Zona Rosa", capacidad=400, generos="Electrónica, House, Techno",
         descripcion="Club con sistema de sonido Funktion-One, cabina elevada y terraza fumadores.",
         instagram="@casaneon.demo",
         ofertas=[("comision_consumo", 8, "Del consumo en barra de la noche"),
                  ("pago_por_asistente", 5000, "Por cada persona registrada que ingrese"),
                  ("pases_promotor", 5, "")]),
    dict(email="patio.lulo@demo.tarima", nombre="El Patio de Lulo", tipo="Restaurante",
         barrio="Usaquén", capacidad=90, generos="Jazz, Acústico",
         descripcion="Restaurante con patio interior para formatos acústicos y jazz de jueves a sábado.",
         instagram="@patiodelulo.demo",
         ofertas=[("pago_fijo", 350000, "Formatos de hasta 3 músicos"),
                  ("bebida_gratis", 1, "Copa de vino de bienvenida")]),
    dict(email="galpon7@demo.tarima", nombre="Galpón 7", tipo="Club / discoteca",
         barrio="Puente Aranda", capacidad=650, generos="Techno, Electrónica",
         descripcion="Bodega industrial para fiestas grandes. Permiso hasta las 5 a.m.",
         instagram="@galpon7.demo",
         ofertas=[("comision_boleteria", 15, "A partir de 200 boletas vendidas"),
                  ("pases_promotor", 10, "")]),
    dict(email="la.clave@demo.tarima", nombre="Salsoteca La Clave", tipo="Bar",
         barrio="La Candelaria", capacidad=250, generos="Salsa, Cumbia / tropical",
         descripcion="Salsoteca clásica con pista de baile amplia y orquesta en vivo los viernes.",
         instagram="@salsotecalaclave.demo",
         ofertas=[("comision_boleteria", 12, ""),
                  ("bebida_gratis", 1, "Aguardiente de cortesía para grupos de 6+")]),
]

PROMOTORES = [
    dict(email="ruido.bogota@demo.tarima", nombre="Ruido Bogotá Producciones",
         generos="Rock, Punk, Metal", instagram="@ruidobogota.demo",
         descripcion="Toques de bandas independientes de rock y punk desde 2019."),
    dict(email="colectivo.pulso@demo.tarima", nombre="Colectivo Pulso",
         generos="Techno, House, Electrónica", instagram="@colectivopulso.demo",
         descripcion="Fiestas de techno con DJs locales e invitados internacionales."),
    dict(email="noches.clave@demo.tarima", nombre="Noches de Clave",
         generos="Salsa, Cumbia / tropical", instagram="@nochesdeclave.demo",
         descripcion="Noches de salsa en vivo y clases de baile."),
    dict(email="laura.acusticos@demo.tarima", nombre="Laura Méndez · Acústicos",
         generos="Jazz, Acústico, Pop", instagram="@lauraacusticos.demo",
         descripcion="Curaduría de formatos acústicos y jazz para restaurantes."),
    dict(email="urbano.fest@demo.tarima", nombre="Urbano Fest",
         generos="Urbano / reggaetón, Hip hop / rap", instagram="@urbanofest.demo",
         descripcion="Eventos de música urbana y batallas de freestyle."),
]

# (espacio, promotor, evento, días desde hoy, estimados, reales, estado,
#  calificación del promotor al espacio, calificación del espacio al promotor)
PROPUESTAS = [
    (0, 0, "Noche de punk independiente", -40, 120, 135, "REALIZADA",
     (5, 5, 4, 4, "Pagaron la comisión al día siguiente. Buen sonido."),
     (5, 5, 5, 5, "Trajeron más gente de la prometida.")),
    (0, 0, "Tributo a los 90", -12, 150, 110, "REALIZADA",
     (4, 4, 5, 4, "Todo bien, el sonidista llegó tarde."),
     (4, 4, 4, 3, "Menos público del esperado, pero buena energía.")),
    (1, 1, "Pulso 004: techno toda la noche", -25, 300, 320, "REALIZADA",
     (5, 5, 5, 5, "Excelente equipo y cumplieron con el pago por asistente."),
     (5, 5, 4, 5, "Muy profesionales.")),
    (3, 1, "Warehouse Pulso", -60, 500, 380, "REALIZADA",
     (3, 2, 3, 4, "Demoraron el pago de la comisión casi un mes."),
     (4, 4, 3, 3, "")),
    (4, 2, "Viernes de salsa brava", -18, 200, 210, "REALIZADA",
     (4, 4, 4, 3, "La pista se llena rápido; falta ventilación."),
     (5, 5, 5, 5, "Cumplidos y con muy buen público.")),
    (2, 3, "Jazz en el patio", -8, 60, 55, "REALIZADA",
     (5, 5, 5, 5, "Muy buena atención."),
     None),  # el espacio aún no califica: no se publica hasta 14 días
    (4, 4, "Batalla de freestyle", -30, 180, 0, "CANCELADA", None, None),
    (1, 4, "Perreo intenso vol. 2", 10, 250, None, "PENDIENTE", None, None),
    (0, 0, "Festival punk de diciembre", 21, 160, None, "ACEPTADA", None, None),
]


def hay_datos_demo() -> bool:
    return any(u["demo"] == "SI" for u in db.leer("usuarios", fresco=True))


def cargar() -> dict:
    """Crea los datos de prueba. Devuelve conteos."""
    if hay_datos_demo():
        raise RuntimeError("Los datos de prueba ya están cargados.")
    pin_hash, salt = auth.hash_pin(PIN_DEMO)
    hoy = date.today()

    usuarios, espacios, promotores, ofertas = [], [], [], []
    esp_ids, prom_ids, esp_users, prom_users = [], [], [], []
    for e in ESPACIOS:
        uid, eid = db.nuevo_id(), db.nuevo_id()
        usuarios.append(dict(usuario_id=uid, rol="espacio", nombre=e["nombre"], email=e["email"],
                             pin_hash=pin_hash, pin_salt=salt, intentos_fallidos="0",
                             estado="ACTIVO", acepta_politica="SI",
                             version_politica=POLITICA_VERSION, demo="SI"))
        espacios.append(dict(espacio_id=eid, usuario_id=uid, nombre=e["nombre"], tipo=e["tipo"],
                             ciudad="Bogotá", barrio=e["barrio"], direccion="(dirección de prueba)",
                             capacidad=e["capacidad"], generos=e["generos"],
                             descripcion=e["descripcion"], instagram=e["instagram"], fotos="",
                             verificado="SI", verificado_por="demo",
                             verificado_fecha=db.ahora(), actualizado=db.ahora()))
        for tipo, valor, cond in e["ofertas"]:
            ofertas.append(dict(espacio_id=eid, tipo=tipo, valor=valor, condicion=cond, activa="SI"))
        esp_ids.append(eid)
        esp_users.append(uid)

    for p in PROMOTORES:
        uid, pid = db.nuevo_id(), db.nuevo_id()
        usuarios.append(dict(usuario_id=uid, rol="promotor", nombre=p["nombre"], email=p["email"],
                             pin_hash=pin_hash, pin_salt=salt, intentos_fallidos="0",
                             estado="ACTIVO", acepta_politica="SI",
                             version_politica=POLITICA_VERSION, demo="SI"))
        promotores.append(dict(promotor_id=pid, usuario_id=uid, nombre=p["nombre"],
                               ciudad="Bogotá", generos=p["generos"], descripcion=p["descripcion"],
                               instagram=p["instagram"], actualizado=db.ahora()))
        prom_ids.append(pid)
        prom_users.append(uid)

    propuestas, cals = [], []
    for ie, ip, evento, dias, est, reales, estado, cal_esp, cal_prom in PROPUESTAS:
        prid = db.nuevo_id()
        fecha = (hoy + timedelta(days=dias)).isoformat()
        propuestas.append(dict(
            propuesta_id=prid, espacio_id=esp_ids[ie], promotor_id=prom_ids[ip],
            nombre_evento=evento, fecha_evento=fecha,
            genero=ESPACIOS[ie]["generos"].split(",")[0].strip(),
            asistentes_estimados=est, mensaje="Propuesta de prueba.", estado=estado,
            respuesta="¡Hagámoslo!" if estado in ("ACEPTADA", "REALIZADA") else "",
            asistentes_reales="" if reales is None else reales, actualizado=db.ahora()))
        for cal, de, a_tipo, a_id in ((cal_esp, prom_users[ip], "espacio", esp_ids[ie]),
                                      (cal_prom, esp_users[ie], "promotor", prom_ids[ip])):
            if cal:
                g, cu, co, ca, obs = cal
                cals.append(dict(propuesta_id=prid, de_usuario_id=de, a_tipo=a_tipo, a_id=a_id,
                                 general=g, cumplimiento=cu, comunicacion=co, calidad=ca,
                                 observaciones=obs))

    db.agregar_varias("usuarios", usuarios)
    db.agregar_varias("espacios", espacios)
    db.agregar_varias("promotores", promotores)
    db.agregar_varias("ofertas", ofertas)
    db.agregar_varias("propuestas", propuestas)
    db.agregar_varias("calificaciones", cals)
    return {"espacios": len(espacios), "promotores": len(promotores),
            "ofertas": len(ofertas), "propuestas": len(propuestas), "calificaciones": len(cals)}
