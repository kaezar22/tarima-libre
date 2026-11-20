import { POLITICA_VERSION } from "@/lib/config";

export const metadata = { title: "Política de datos" };

export default function Privacidad() {
  const resp = process.env.RESPONSABLE_NOMBRE || "Tarima Libre";
  const mail = process.env.RESPONSABLE_EMAIL || "hello@tarimalibre.com";
  return (
    <article className="flex flex-col gap-3 px-5 pt-8 text-[15px] leading-relaxed [&_h2]:titulo [&_h2]:m-0 [&_h2]:pt-3 [&_h2]:text-2xl [&_p]:m-0">
      <h1 className="titulo m-0 text-4xl">Política de tratamiento de datos personales</h1>
      <p className="text-sm text-gris">Versión {POLITICA_VERSION}. Plantilla del beta: será revisada por un abogado antes del lanzamiento público.</p>
      <h2>Responsable</h2>
      <p>{resp}. Contacto: <a href={`mailto:${mail}`}>{mail}</a>.</p>
      <h2>Datos que recogemos</h2>
      <p>Nombre, correo, celular, datos del espacio o de tu actividad como promotor o artista, fotos del espacio, eventos, calificaciones y observaciones. Si usas el análisis de Instagram, el texto público de tu bio y publicaciones (no las imágenes). Si te registras con QR Eventos: nombre, correo, celular y tu ingreso al evento.</p>
      <h2>Para qué los usamos</h2>
      <p>Crear tu cuenta; mostrar tu perfil a promotores o espacios; registrar el historial de eventos y calcular la reputación; generar tu QR personal y verificar tu ingreso; y, si lo autorizas, clasificar el tipo de eventos que promueves.</p>
      <h2>Encargados</h2>
      <p>Google (almacenamiento), Cloudinary (fotos), Vercel (alojamiento), nuestro proveedor de correo y DeepSeek (análisis automático de texto de Instagram, que puede procesar información fuera de Colombia; al usar esa función autorizas la transferencia).</p>
      <h2>Qué ve cada quien</h2>
      <p>El público ve el nombre de los eventos realizados y su número de asistentes. Promotores y espacios registrados ven el historial completo de eventos, perfiles y reputación. El promotor que te invitó con QR Eventos y el espacio ven conteos, no tus datos de contacto. No vendemos tus datos.</p>
      <h2>Tus derechos</h2>
      <p>Según la Ley 1581 de 2012 puedes conocer, actualizar, rectificar y pedir que eliminemos tus datos, o revocar esta autorización, escribiendo a {mail}. También puedes acudir a la Superintendencia de Industria y Comercio.</p>
    </article>
  );
}
