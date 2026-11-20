// Envío del QR personal por correo (SMTP). Si no está configurado, no envía.
import "server-only";
import nodemailer from "nodemailer";

export const correoConfigurado = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export async function enviarQr(d: { para: string; nombre: string; evento: string; fecha: string; lugar: string; beneficio: string; png: Buffer; codigo: string }) {
  if (!correoConfigurado()) return "NO_CONFIGURADO";
  const port = Number(process.env.SMTP_PORT || 465);
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `Tarima Libre <${process.env.SMTP_USER}>`,
      to: d.para,
      subject: `Tu QR para ${d.evento}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px">
        <h2 style="margin:0 0 8px">Hola ${escapar(d.nombre)}, ya estás en la lista</h2>
        <p><b>${escapar(d.evento)}</b><br>${escapar(d.fecha)} · ${escapar(d.lugar)}</p>
        ${d.beneficio ? `<p>Tu beneficio: <b>${escapar(d.beneficio)}</b></p>` : ""}
        <p>Muestra este código en la puerta:</p>
        <img src="cid:qr" width="240" height="240" alt="Tu código QR">
        <p style="color:#666;font-size:13px">Código: ${d.codigo}. Es personal: sirve para una sola entrada.</p>
        <p style="color:#666;font-size:12px">Tarima Libre · tarimalibre.com</p></div>`,
      attachments: [{ filename: "qr.png", content: d.png, cid: "qr" }],
    });
    return "SI";
  } catch {
    return "ERROR";
  }
}

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
