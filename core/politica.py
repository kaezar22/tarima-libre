"""Política de tratamiento de datos (Ley 1581 de 2012, Colombia).

IMPORTANTE: plantilla para el beta. Antes de abrir al público, revísala con un
abogado y completa los datos del responsable.
"""


def texto_politica(responsable: str, contacto: str, version: str) -> str:
    return f"""
### Política de tratamiento de datos personales — Tarima Libre (beta)

**Versión:** {version}

**Responsable del tratamiento:** {responsable}. Contacto: {contacto}.

**Datos que recogemos:** nombre, correo electrónico, celular, datos del espacio o de
la actividad como promotor, fotos del espacio, propuestas de eventos, calificaciones
y observaciones. Si conectas o pegas tu información de Instagram, también el texto
público de tu bio y tus publicaciones (no las imágenes).

**Para qué los usamos:**
1. Crear tu cuenta y permitirte ingresar con tu PIN.
2. Mostrar tu perfil a promotores o espacios para que puedan contactarte.
3. Calcular la reputación de espacios y promotores a partir de los eventos realizados.
4. Clasificar el tipo de contenido y público de tu cuenta de Instagram, solo si tú lo autorizas.

**Encargados que procesan datos por nosotros:**
- Google (almacenamiento de la información).
- Cloudinary (almacenamiento de fotos de los espacios).
- DeepSeek (análisis automático del texto de Instagram). Este proveedor puede
  procesar la información fuera de Colombia. Al usar el análisis de Instagram
  autorizas esa transferencia.

**Qué ven otros usuarios:** el perfil público del espacio o promotor, sus ofertas
y su reputación. Las calificaciones se publican sin el nombre de quien califica.
No vendemos tus datos.

**Tus derechos (Ley 1581 de 2012):** puedes conocer, actualizar, rectificar y pedir
que eliminemos tus datos, o revocar esta autorización, escribiendo a {contacto}.
También puedes presentar quejas ante la Superintendencia de Industria y Comercio.

**Conservación:** guardamos tus datos mientras tengas cuenta activa y luego los
eliminamos o anonimizamos.

Al marcar la casilla de aceptación autorizas de forma previa, expresa e informada
el tratamiento de tus datos para las finalidades descritas.
"""
