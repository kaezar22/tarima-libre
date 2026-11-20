import "server-only";
import QRCode from "qrcode";
import crypto from "crypto";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I
export function codigoCorto(n = 6): string {
  const b = crypto.randomBytes(n);
  return Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join("");
}

export const qrDataUrl = (texto: string) => QRCode.toDataURL(texto, { width: 480, margin: 1, color: { dark: "#141414", light: "#FFFFFF" } });
export const qrPng = (texto: string) => QRCode.toBuffer(texto, { width: 480, margin: 1 });
