// Configuración central: tablas (= pestañas de Google Sheets = futuras tablas de Supabase)
// y catálogos. Para agregar columnas, ponlas AL FINAL de cada lista.

export const APP_NAME = "Tarima Libre";
export const LEMA = "Red creativa de escena y cultura";
export const TIMEZONE = "America/Bogota";
export const POLITICA_VERSION = "v2-2026-11";

export const TABLAS = {
  usuarios: [
    "usuario_id", "rol", "nombre", "email", "celular", "pin_hash", "pin_salt",
    "intentos_fallidos", "bloqueado_hasta", "estado", "acepta_politica",
    "version_politica", "demo", "creado", "ultimo_ingreso",
  ],
  espacios: [
    "espacio_id", "usuario_id", "nombre", "tipo", "ciudad", "barrio", "direccion",
    "capacidad", "generos", "descripcion", "instagram", "fotos", "verificado",
    "verificado_por", "verificado_fecha", "notas_verificacion", "demo", "creado", "actualizado",
  ],
  promotores: [
    "promotor_id", "usuario_id", "nombre", "tipo", "ciudad", "generos", "descripcion",
    "instagram", "demo", "creado", "actualizado",
  ],
  beneficios: [
    "beneficio_id", "espacio_id", "para", "tipo", "valor", "condicion", "activo", "creado",
  ],
  eventos: [
    "evento_id", "espacio_id", "nombre", "fecha", "hora", "genero", "artistas", "mensaje",
    "estado", "respuesta", "asistentes_esperados", "asistentes_reales", "creado_por",
    "demo", "creado", "actualizado",
  ],
  evento_promotores: [
    "ep_id", "evento_id", "promotor_id", "rol", "asistentes_prometidos", "asistentes_reales", "creado",
  ],
  calificaciones: [
    "calificacion_id", "evento_id", "de_tipo", "de_id", "a_tipo", "a_id", "general",
    "cumplimiento", "comunicacion", "calidad", "observaciones", "demo", "creado",
  ],
  perfiles_ig: [
    "perfil_id", "usuario_id", "instagram", "fuente", "generos", "tipo_contenido", "publico",
    "tono", "etiquetas", "resumen", "publicaciones_analizadas", "modelo", "creado",
  ],
  invitaciones: [
    "codigo", "evento_id", "promotor_id", "nombre_artista", "beneficio", "activa", "creado",
  ],
  registros: [
    "registro_id", "codigo", "evento_id", "promotor_id", "nombre", "email", "celular",
    "acepta_politica", "version_politica", "checkin", "checkin_hora", "email_enviado", "creado",
  ],
} as const;

export type Tabla = keyof typeof TABLAS;
// Fila de una tabla: todos los valores guardados son texto; los objetos enriquecidos agregan campos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Fila = Record<string, any>;

export type Rol = "espacio" | "promotor" | "admin";

export const TIPOS_ESPACIO = [
  "Bar", "Restaurante", "Club / discoteca", "Café", "Teatro / auditorio",
  "Galería / espacio cultural", "Terraza", "Otro",
];

export const GENEROS = [
  "Rock", "Indie", "Metal", "Punk", "Electrónica", "Techno", "House", "Urbano / reggaetón",
  "Hip hop / rap", "Salsa", "Cumbia / tropical", "Vallenato", "Jazz", "Acústico", "Pop",
  "Stand-up / comedia", "Arte / exposiciones", "Otro",
];

export const CIUDADES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Otra"];

export type Para = "promotor" | "publico";
export type TipoBeneficio = {
  para: Para;
  etiqueta: string;
  corto: string; // para tarjetas: "{v}% de boletería"
  unidad: "%" | "COP" | "uds" | "hora" | "";
};

export const TIPOS_BENEFICIO: Record<string, TipoBeneficio> = {
  comision_boleteria: { para: "promotor", etiqueta: "% de la boletería", corto: "{v}% de boletería", unidad: "%" },
  comision_consumo: { para: "promotor", etiqueta: "% del consumo", corto: "{v}% del consumo", unidad: "%" },
  pago_por_asistente: { para: "promotor", etiqueta: "Pago por asistente", corto: "{v} por asistente", unidad: "COP" },
  pago_fijo: { para: "promotor", etiqueta: "Pago fijo por evento", corto: "{v} fijo", unidad: "COP" },
  entradas_gratis: { para: "promotor", etiqueta: "Entradas gratis", corto: "{v} entradas", unidad: "uds" },
  bebida_gratis: { para: "publico", etiqueta: "Bebida gratis", corto: "{v} bebida(s) gratis c/u", unidad: "uds" },
  descuento_consumo: { para: "publico", etiqueta: "% descuento en consumo", corto: "{v}% en consumo", unidad: "%" },
  descuento_entrada: { para: "publico", etiqueta: "% descuento en la entrada", corto: "{v}% en la entrada", unidad: "%" },
  cover_gratis_hasta: { para: "publico", etiqueta: "Cover gratis antes de", corto: "Cover gratis antes de {v}", unidad: "hora" },
};

export const ESTADOS_EVENTO: Record<string, string> = {
  PENDIENTE: "Propuesta pendiente",
  ACEPTADA: "Confirmado",
  RECHAZADA: "Rechazado",
  REALIZADA: "Realizado",
  CANCELADA: "Cancelado",
};

export const DIMENSIONES: Record<"espacio" | "promotor", Record<string, string>> = {
  espacio: {
    general: "General",
    cumplimiento: "Cumplió lo ofrecido",
    comunicacion: "Trato y comunicación",
    calidad: "Lugar, sonido y logística",
  },
  promotor: {
    general: "General",
    cumplimiento: "Cumplimiento y puntualidad",
    comunicacion: "Trato y comunicación",
    calidad: "Convocatoria",
  },
};

export const DIAS_PUBLICAR_CALIFICACION = 14;
export const PIN_LARGO = 6;
export const PIN_MAX_INTENTOS = 5;
export const PIN_BLOQUEO_MINUTOS = 15;
export const MAX_FOTOS_ESPACIO = 6;
export const QR_PREFIJO = "TLQR:";
