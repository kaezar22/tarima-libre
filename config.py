"""Configuración central de Tarima Libre (beta).

Cada pestaña de Google Sheets corresponde a una futura tabla de Supabase.
El primer campo de cada tabla es su ID (uuid corto). El orden de las columnas
importa al escribir; para agregar columnas nuevas, ponlas AL FINAL.
"""

APP_NAME = "Tarima Libre"
TIMEZONE = "America/Bogota"
POLITICA_VERSION = "v1-2026-11"

# ---------------------------------------------------------------------------
# Tablas (pestañas)
# ---------------------------------------------------------------------------
TABLAS: dict[str, list[str]] = {
    # Login: una fila por persona. El PIN nunca se guarda en claro.
    "usuarios": [
        "usuario_id",
        "rol",                 # espacio / promotor / admin
        "nombre",
        "email",
        "celular",
        "pin_hash",
        "pin_salt",
        "intentos_fallidos",
        "bloqueado_hasta",     # fecha-hora ISO o vacío
        "estado",              # ACTIVO / PENDIENTE / INACTIVO
        "acepta_politica",
        "version_politica",
        "demo",                # SI para datos de prueba
        "creado",
        "ultimo_ingreso",
    ],
    "espacios": [
        "espacio_id",
        "usuario_id",          # dueño / administrador del espacio
        "nombre",
        "tipo",                # Bar / Restaurante / Club / ...
        "ciudad",
        "barrio",
        "direccion",
        "capacidad",
        "generos",             # separados por coma
        "descripcion",
        "instagram",
        "fotos",               # JSON: [{"url": ..., "public_id": ...}]
        "verificado",          # SI / NO
        "verificado_por",
        "verificado_fecha",
        "notas_verificacion",  # solo admin
        "creado",
        "actualizado",
    ],
    "promotores": [
        "promotor_id",
        "usuario_id",
        "nombre",              # nombre artístico / productora
        "ciudad",
        "generos",
        "descripcion",
        "instagram",
        "creado",
        "actualizado",
    ],
    # Lo que ofrece un espacio. Un espacio puede tener varias ofertas
    # combinadas (p. ej. 10% de boletería + 3 pases gratis).
    "ofertas": [
        "oferta_id",
        "espacio_id",
        "tipo",                # ver TIPOS_OFERTA
        "valor",               # número (%, $, cantidad)
        "condicion",           # texto libre
        "activa",              # SI / NO
        "creado",
    ],
    "propuestas": [
        "propuesta_id",
        "espacio_id",
        "promotor_id",
        "nombre_evento",
        "fecha_evento",
        "genero",
        "asistentes_estimados",
        "mensaje",
        "estado",              # ver ESTADOS_PROPUESTA
        "respuesta",           # mensaje del espacio
        "asistentes_reales",   # lo registra el espacio (o QR Eventos más adelante)
        "invitacion_qr",       # código de QR Eventos (fase 2)
        "creado",
        "actualizado",
    ],
    # Cada parte califica a la otra una vez por propuesta realizada.
    "calificaciones": [
        "calificacion_id",
        "propuesta_id",
        "de_usuario_id",
        "a_tipo",              # espacio / promotor
        "a_id",                # espacio_id o promotor_id
        "general",             # 1-5
        "cumplimiento",        # 1-5
        "comunicacion",        # 1-5
        "calidad",             # 1-5 (espacio: lugar/sonido; promotor: convocatoria)
        "observaciones",
        "creado",
    ],
    # Resultado del análisis de contenido de Instagram (solo texto).
    "perfiles_ig": [
        "perfil_id",
        "usuario_id",
        "instagram",
        "fuente",              # oauth / manual
        "generos",
        "tipo_contenido",
        "publico",
        "tono",
        "etiquetas",
        "resumen",
        "publicaciones_analizadas",
        "modelo",
        "creado",
    ],
}

# ---------------------------------------------------------------------------
# Catálogos
# ---------------------------------------------------------------------------
ROLES = ["espacio", "promotor", "admin"]

TIPOS_ESPACIO = ["Bar", "Restaurante", "Club / discoteca", "Café", "Teatro / auditorio",
                 "Galería / espacio cultural", "Terraza", "Otro"]

GENEROS = ["Rock", "Indie", "Metal", "Punk", "Electrónica", "Techno", "House",
           "Urbano / reggaetón", "Hip hop / rap", "Salsa", "Cumbia / tropical",
           "Vallenato", "Jazz", "Acústico", "Pop", "Stand-up / comedia",
           "Arte / exposiciones", "Otro"]

CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Otra"]

# tipo -> (etiqueta, unidad, ¿beneficia al promotor?)
TIPOS_OFERTA: dict[str, tuple[str, str, bool]] = {
    "comision_boleteria": ("Comisión sobre boletería", "%", True),
    "comision_consumo": ("Comisión sobre consumo", "%", True),
    "pago_por_asistente": ("Pago por asistente", "COP", True),
    "pago_fijo": ("Pago fijo por evento", "COP", True),
    "pases_promotor": ("Pases gratis para el promotor", "pases", True),
    "bebida_gratis": ("Bebida gratis para asistentes", "por persona", False),
    "descuento_publico": ("Descuento para el público", "%", False),
    "otro": ("Otro beneficio", "", False),
}

ESTADOS_PROPUESTA = {
    "PENDIENTE": "🕓 Pendiente",
    "ACEPTADA": "✅ Aceptada",
    "RECHAZADA": "❌ Rechazada",
    "REALIZADA": "🎤 Realizada",
    "CANCELADA": "🚫 Cancelada",
}

# Etiquetas de las dimensiones de calificación según a quién se califica.
DIMENSIONES = {
    "espacio": {
        "general": "General",
        "cumplimiento": "Cumplió lo ofrecido (comisión, pases)",
        "comunicacion": "Trato y comunicación",
        "calidad": "Lugar, sonido y logística",
    },
    "promotor": {
        "general": "General",
        "cumplimiento": "Cumplimiento y puntualidad",
        "comunicacion": "Trato y comunicación",
        "calidad": "Convocatoria (gente que trajo)",
    },
}

# Las calificaciones de un evento se publican cuando ambas partes calificaron
# o cuando pasan estos días desde el evento (evita represalias).
DIAS_PUBLICAR_CALIFICACION = 14

# Seguridad del PIN
PIN_LARGO = 6
PIN_MAX_INTENTOS = 5
PIN_BLOQUEO_MINUTOS = 15

MAX_FOTOS_ESPACIO = 6
