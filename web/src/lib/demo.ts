// Datos de prueba (ficticios): 5 espacios, 8 promotores/artistas y 30 eventos.
// Todo lleva demo = "SI" y se muestra con la etiqueta DEMO.
import "server-only";
import * as db from "./db";
import { hashPin } from "./auth";
import { POLITICA_VERSION, type Fila } from "./config";
import { ahora, hoy, sumarDias } from "./fechas";

export const PIN_DEMO = "482916";

type B = [para: "promotor" | "publico", tipo: string, valor: string | number, condicion?: string];

export const ESPACIOS: {
  email: string; nombre: string; tipo: string; barrio: string; capacidad: number; generos: string;
  descripcion: string; instagram: string; beneficios: B[]; eventos: string[]; promotores: string[];
  ig: [string, string, string, string, string]; fotos: string[];
}[] = [
  {
    email: "bodega.sonica@demo.tarima", nombre: "La Bodega Sónica", tipo: "Bar", barrio: "Chapinero",
    capacidad: 180, generos: "Rock, Indie, Punk", instagram: "@bodegasonica.demo",
    descripcion: "Bar de rock con tarima propia, backline básico y sonido para bandas de 4 o 5 integrantes.",
    beneficios: [["promotor", "comision_boleteria", 10, "Sobre boletas vendidas con el link del promotor"], ["promotor", "entradas_gratis", 3],
      ["publico", "descuento_consumo", 15, "En cerveza nacional antes de las 10 p.m."]],
    eventos: ["Noche de punk independiente", "Tributo a los 90", "Rock en español vol. 3", "Garaje sónico", "Indie de los jueves", "Festival punk de diciembre"],
    promotores: ["ruido.bogota", "los.tercos"],
    fotos: ["club-4", "club-9"],
    ig: ["Rock, Punk, Indie", "agenda de toques de bandas independientes", "jóvenes de 20 a 35, escena rockera de Chapinero", "irreverente", "rock en vivo, bandas locales, cerveza, toques, punk"],
  },
  {
    email: "casa.neon@demo.tarima", nombre: "Casa Neón", tipo: "Club / discoteca", barrio: "Zona Rosa",
    capacidad: 400, generos: "Electrónica, House, Techno", instagram: "@casaneon.demo",
    descripcion: "Club con sistema de sonido de alta gama, cabina elevada y terraza. Permiso hasta las 3 a.m.",
    beneficios: [["promotor", "comision_consumo", 8, "Del consumo en barra de la noche"], ["promotor", "pago_por_asistente", 5000, "Solo personas registradas con QR"],
      ["promotor", "entradas_gratis", 5], ["publico", "cover_gratis_hasta", "11 p.m."], ["publico", "descuento_consumo", 10]],
    eventos: ["Pulso 003", "Sunset House Session", "Pulso 004: techno toda la noche", "Neón Disco Club", "Deep Jueves", "Perreo intenso vol. 2", "Año Nuevo Neón"],
    promotores: ["colectivo.pulso", "dj.marea", "urbano.fest"],
    fotos: ["club-3", "club-1", "club-10"],
    ig: ["Electrónica, House, Techno", "fiestas de música electrónica de fin de semana", "22 a 35 años, estilo nocturno y alternativo", "exclusivo", "techno, house, DJ sets, after party, Zona Rosa"],
  },
  {
    email: "patio.lulo@demo.tarima", nombre: "El Patio de Lulo", tipo: "Restaurante", barrio: "Usaquén",
    capacidad: 90, generos: "Jazz, Acústico", instagram: "@patiodelulo.demo",
    descripcion: "Restaurante con patio interior para formatos acústicos y jazz de jueves a sábado.",
    beneficios: [["promotor", "pago_fijo", 350000, "Formatos de hasta 3 músicos"], ["publico", "bebida_gratis", 1, "Copa de vino de bienvenida"]],
    eventos: ["Jazz en el patio", "Bossa y vino", "Acústico de luna llena", "Trío de los sábados", "Standards de jazz"],
    promotores: ["laura.acusticos", "lia.sol"],
    fotos: ["club-6"],
    ig: ["Jazz, Acústico", "cenas con música en vivo", "parejas y grupos de 28 a 50 años", "cálido", "jazz, vino, cena, música en vivo, Usaquén"],
  },
  {
    email: "galpon7@demo.tarima", nombre: "Galpón 7", tipo: "Club / discoteca", barrio: "Puente Aranda",
    capacidad: 650, generos: "Techno, Electrónica", instagram: "@galpon7.demo",
    descripcion: "Bodega industrial para fiestas grandes. Permiso hasta las 5 a.m.",
    beneficios: [["promotor", "comision_boleteria", 15, "A partir de 200 boletas vendidas"], ["promotor", "entradas_gratis", 10]],
    eventos: ["Warehouse Pulso", "Industrial 01", "Marea Alta", "Industrial 02"],
    promotores: ["colectivo.pulso", "dj.marea"],
    fotos: ["club-8"],
    ig: ["Techno, Electrónica", "fiestas techno de gran formato", "21 a 30 años, escena underground", "intenso", "techno, warehouse, rave, bodega"],
  },
  {
    email: "la.clave@demo.tarima", nombre: "Salsoteca La Clave", tipo: "Bar", barrio: "La Candelaria",
    capacidad: 250, generos: "Salsa, Cumbia / tropical", instagram: "@salsotecalaclave.demo",
    descripcion: "Salsoteca clásica con pista amplia y orquesta en vivo los viernes.",
    beneficios: [["promotor", "comision_boleteria", 12], ["publico", "bebida_gratis", 1, "Aguardiente de cortesía para grupos de 6 o más"], ["publico", "descuento_entrada", 20, "Con registro QR"]],
    eventos: ["Viernes de salsa brava", "Noche de cumbia", "Salsa vieja guardia", "Batalla de freestyle", "Salsa y son", "Pachanga de fin de mes", "Rumba de diciembre", "Clases y rumba"],
    promotores: ["noches.clave", "urbano.fest"],
    fotos: ["club-7", "club-2"],
    ig: ["Salsa, Cumbia / tropical", "noches de salsa con orquesta", "adultos de 25 a 55, amantes del baile", "festivo", "salsa, orquesta, baile, Candelaria"],
  },
];

export const PROMOTORES: { clave: string; nombre: string; tipo: string; generos: string; instagram: string; descripcion: string }[] = [
  { clave: "ruido.bogota", nombre: "Ruido Bogotá Producciones", tipo: "promotor", generos: "Rock, Punk, Metal", instagram: "@ruidobogota.demo", descripcion: "Toques de bandas independientes de rock y punk desde 2019." },
  { clave: "colectivo.pulso", nombre: "Colectivo Pulso", tipo: "ambos", generos: "Techno, House, Electrónica", instagram: "@colectivopulso.demo", descripcion: "Fiestas de techno con DJs locales e invitados internacionales." },
  { clave: "noches.clave", nombre: "Noches de Clave", tipo: "promotor", generos: "Salsa, Cumbia / tropical", instagram: "@nochesdeclave.demo", descripcion: "Noches de salsa en vivo y clases de baile." },
  { clave: "laura.acusticos", nombre: "Laura Méndez · Acústicos", tipo: "ambos", generos: "Jazz, Acústico, Pop", instagram: "@lauraacusticos.demo", descripcion: "Curaduría de formatos acústicos y jazz para restaurantes." },
  { clave: "urbano.fest", nombre: "Urbano Fest", tipo: "promotor", generos: "Urbano / reggaetón, Hip hop / rap", instagram: "@urbanofest.demo", descripcion: "Eventos de música urbana y batallas de freestyle." },
  { clave: "dj.marea", nombre: "DJ Marea", tipo: "ambos", generos: "Techno, House", instagram: "@djmarea.demo", descripcion: "DJ y productora de techno; organiza sus propias noches." },
  { clave: "lia.sol", nombre: "Lía Sol", tipo: "artista", generos: "Acústico, Pop, Jazz", instagram: "@liasol.demo", descripcion: "Cantautora; llena salas pequeñas con su público fiel." },
  { clave: "los.tercos", nombre: "Los Tercos", tipo: "artista", generos: "Rock, Punk", instagram: "@lostercos.demo", descripcion: "Banda de punk rock que también promueve sus toques." },
];

const ARTISTAS: Record<string, string[]> = {
  "La Bodega Sónica": ["Los Tercos", "Ruido Blanco", "La Pestaña", "Kilómetro Cero", "Sonora Bruta"],
  "Casa Neón": ["DJ Marea", "Nocturna", "K-Lab", "Bruma", "Lía Sol (DJ set)", "Neón Kids"],
  "El Patio de Lulo": ["Lía Sol", "Trío Altiplano", "Ana Coral", "Cuarteto Usaquén"],
  "Galpón 7": ["DJ Marea", "Nocturna", "Hertz", "Concreto"],
  "Salsoteca La Clave": ["Orquesta La Clave", "Sexteto Candela", "MC Barrio", "Son de la 7"],
};

const OBS_ESPACIO = ["Pagaron lo acordado al día siguiente.", "Buen sonido y equipo muy atento.", "Todo cumplido, volveríamos.", "El sonidista llegó tarde, el resto bien.", "Demoraron el pago de la comisión.", ""];
const OBS_PROMOTOR = ["Trajeron más gente de la prometida.", "Muy profesionales.", "Menos público del esperado, pero buena energía.", "Cumplidos con horarios.", ""];

function prng(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function hayDemo() {
  return (await db.leer("usuarios", true)).some((u) => u.demo === "SI");
}

export async function cargarDemo() {
  if (await hayDemo()) throw new Error("Los datos de prueba ya están cargados.");
  const r = prng(20261120);
  const elegir = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const entre = (a: number, b: number) => Math.round(a + r() * (b - a));
  const { hash, salt } = hashPin(PIN_DEMO);
  const base = { pin_hash: hash, pin_salt: salt, intentos_fallidos: "0", estado: "ACTIVO", acepta_politica: "SI", version_politica: POLITICA_VERSION, demo: "SI" };

  const usuarios: Fila[] = [], espacios: Fila[] = [], promotores: Fila[] = [], beneficios: Fila[] = [], perfiles: Fila[] = [];
  const espId: Record<string, string> = {}, espUser: Record<string, string> = {}, promId: Record<string, string> = {};

  for (const e of ESPACIOS) {
    const uid = db.nuevoId(), eid = db.nuevoId();
    espId[e.nombre] = eid; espUser[e.nombre] = uid;
    usuarios.push({ ...base, usuario_id: uid, rol: "espacio", nombre: e.nombre, email: e.email } as Fila);
    espacios.push({
      espacio_id: eid, usuario_id: uid, nombre: e.nombre, tipo: e.tipo, ciudad: "Bogotá", barrio: e.barrio,
      direccion: "(dirección de prueba)", capacidad: String(e.capacidad), generos: e.generos, descripcion: e.descripcion,
      instagram: e.instagram, fotos: JSON.stringify(e.fotos.map((f) => ({ url: `/fotos/${f}.jpg`, public_id: "" }))), verificado: "SI", verificado_por: "demo", verificado_fecha: ahora(), demo: "SI",
    } as Fila);
    for (const [para, tipo, valor, condicion] of e.beneficios) {
      beneficios.push({ espacio_id: eid, para, tipo, valor: String(valor), condicion: condicion ?? "", activo: "SI" } as Fila);
    }
    perfiles.push(perfilIg(uid, e.instagram, e.ig));
  }
  for (const p of PROMOTORES) {
    const uid = db.nuevoId(), pid = db.nuevoId();
    promId[p.clave] = pid;
    usuarios.push({ ...base, usuario_id: uid, rol: "promotor", nombre: p.nombre, email: `${p.clave}@demo.tarima` } as Fila);
    promotores.push({ promotor_id: pid, usuario_id: uid, nombre: p.nombre, tipo: p.tipo, ciudad: "Bogotá", generos: p.generos, descripcion: p.descripcion, instagram: p.instagram, demo: "SI" } as Fila);
  }
  // Algunos promotores con análisis de Instagram
  const igProm: Record<string, [string, string, string, string, string]> = {
    "colectivo.pulso": ["Techno, House", "fiestas de techno y house de larga duración", "22 a 32 años, escena underground", "comunitario", "techno, house, warehouse, DJ invitados"],
    "ruido.bogota": ["Rock, Punk", "toques de bandas independientes", "20 a 35 años, rockeros de Chapinero", "irreverente", "punk, rock, bandas locales, toques"],
    "noches.clave": ["Salsa", "noches de salsa con orquesta en vivo", "25 a 55 años, bailadores", "festivo", "salsa, orquesta, baile"],
    "lia.sol": ["Acústico, Pop", "conciertos íntimos de cantautora", "25 a 40 años, público fiel", "cercano", "acústico, cantautora, pop, íntimo"],
  };
  for (const [clave, d] of Object.entries(igProm)) {
    const uid = usuarios.find((u) => u.email === `${clave}@demo.tarima`)!.usuario_id;
    perfiles.push(perfilIg(uid, PROMOTORES.find((p) => p.clave === clave)!.instagram, d));
  }

  // 30 eventos: 25 realizados, 2 cancelados, 3 próximos
  const h = hoy();
  const plan: { esp: (typeof ESPACIOS)[number]; nombre: string; dias: number; estado: string }[] = [];
  const nombres = ESPACIOS.flatMap((esp) => esp.eventos.map((n) => ({ esp, nombre: n })));
  const futuros = new Set(["Festival punk de diciembre", "Año Nuevo Neón", "Rumba de diciembre"]);
  const pasados = nombres.filter((x) => !futuros.has(x.nombre));
  pasados.forEach((x, i) => {
    const dias = -Math.round(170 - (i * 165) / pasados.length) - entre(0, 3);
    const estado = x.nombre === "Batalla de freestyle" || x.nombre === "Industrial 02" ? "CANCELADA" : "REALIZADA";
    plan.push({ ...x, dias, estado });
  });
  plan.push({ esp: ESPACIOS[0], nombre: "Festival punk de diciembre", dias: 21, estado: "ACEPTADA" });
  plan.push({ esp: ESPACIOS[1], nombre: "Año Nuevo Neón", dias: 41, estado: "ACEPTADA" });
  plan.push({ esp: ESPACIOS[4], nombre: "Rumba de diciembre", dias: 28, estado: "PENDIENTE" });

  const eventos: Fila[] = [], eps: Fila[] = [], cals: Fila[] = [];
  plan.sort((a, b) => a.dias - b.dias).forEach((p, i) => {
    const evId = db.nuevoId();
    const fecha = sumarDias(h, p.dias);
    const cap = p.esp.capacidad;
    const nProm = p.esp.promotores.length > 1 && r() < 0.35 ? 2 : 1;
    const claves = [...p.esp.promotores].sort(() => r() - 0.5).slice(0, nProm);
    let esperados = 0, reales = 0;
    const misEps = claves.map((clave, j) => {
      const prometidos = Math.max(15, Math.round((cap * (j === 0 ? entre(45, 80) : entre(15, 30))) / 100 / 5) * 5);
      const factor = p.esp.nombre === "Galpón 7" ? 0.6 + r() * 0.45 : 0.75 + r() * 0.5;
      const llegaron = p.estado === "REALIZADA" ? Math.min(Math.round(prometidos * factor), cap) : 0;
      esperados += prometidos; reales += llegaron;
      return { ep_id: db.nuevoId(), evento_id: evId, promotor_id: promId[clave], rol: j === 0 ? "principal" : "copromotor",
        asistentes_prometidos: String(prometidos), asistentes_reales: p.estado === "REALIZADA" ? String(llegaron) : "", _clave: clave, _ratio: llegaron / prometidos };
    });
    reales = Math.min(reales, cap);
    const artistas = [...ARTISTAS[p.esp.nombre]].sort(() => r() - 0.5).slice(0, entre(1, 3)).join(", ");
    eventos.push({
      evento_id: evId, espacio_id: espId[p.esp.nombre], nombre: p.nombre, fecha, hora: elegir(["8:00 p.m.", "9:00 p.m.", "10:00 p.m."]),
      genero: p.esp.generos.split(",")[0].trim(), artistas, mensaje: "Propuesta de prueba.", estado: p.estado,
      respuesta: ["ACEPTADA", "REALIZADA"].includes(p.estado) ? "¡Hagámoslo!" : "",
      asistentes_esperados: String(esperados), asistentes_reales: p.estado === "REALIZADA" ? String(reales) : "",
      creado_por: misEps[0].promotor_id, demo: "SI", creado: `${sumarDias(fecha, -20)} 12:00:00`,
    } as Fila);
    for (const { _clave, _ratio, ...ep } of misEps) {
      eps.push(ep as Fila);
      if (p.estado !== "REALIZADA") continue;
      const reciente = i >= plan.length - 6; // los 2 últimos realizados quedan sin calificar del todo
      // Promotor → espacio
      const baseEsp = p.esp.nombre === "Galpón 7" ? 3 : 4;
      if (!(reciente && r() < 0.5)) {
        cals.push(cal(evId, "promotor", ep.promotor_id, "espacio", espId[p.esp.nombre], baseEsp, r, elegir(OBS_ESPACIO)));
      }
      // Espacio → promotor (convocatoria según asistencia real)
      if (!(reciente && r() < 0.5)) {
        const conv = _ratio >= 1.05 ? 5 : _ratio >= 0.9 ? 4 : _ratio >= 0.7 ? 3 : 2;
        cals.push(cal(evId, "espacio", espId[p.esp.nombre], "promotor", ep.promotor_id, 4, r, elegir(OBS_PROMOTOR), conv));
      }
    }
  });

  await db.agregarVarias("usuarios", usuarios);
  await db.agregarVarias("espacios", espacios);
  await db.agregarVarias("promotores", promotores);
  await db.agregarVarias("beneficios", beneficios);
  await db.agregarVarias("eventos", eventos);
  await db.agregarVarias("evento_promotores", eps);
  await db.agregarVarias("calificaciones", cals);
  await db.agregarVarias("perfiles_ig", perfiles);
  return { usuarios: usuarios.length, eventos: eventos.length, calificaciones: cals.length };
}

function cal(eventoId: string, deTipo: string, deId: string, aTipo: string, aId: string, base: number,
  r: () => number, obs: string, calidad?: number): Fila {
  const v = () => String(Math.max(1, Math.min(5, base + (r() < 0.35 ? 1 : 0) - (r() < 0.15 ? 1 : 0))));
  const cal = calidad ?? Number(v());
  const cump = Number(v()), com = Number(v());
  return {
    calificacion_id: db.nuevoId(), evento_id: eventoId, de_tipo: deTipo, de_id: deId, a_tipo: aTipo, a_id: aId,
    general: String(Math.round((cal + cump + com) / 3)), cumplimiento: String(cump), comunicacion: String(com),
    calidad: String(cal), observaciones: obs, demo: "SI", creado: ahora(),
  } as Fila;
}

function perfilIg(usuarioId: string, ig: string, d: [string, string, string, string, string]): Fila {
  return {
    perfil_id: db.nuevoId(), usuario_id: usuarioId, instagram: ig, fuente: "demo", generos: d[0], tipo_contenido: d[1],
    publico: d[2], tono: d[3], etiquetas: d[4], resumen: "", publicaciones_analizadas: "12", modelo: "demo", creado: ahora(),
  } as Fila;
}
