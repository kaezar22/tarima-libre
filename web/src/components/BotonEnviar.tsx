"use client";
import { useFormStatus } from "react-dom";

export function BotonEnviar({ children, className = "btn btn-primario w-full", pendiente = "Guardando…", ...rest }:
  { children: React.ReactNode; className?: string; pendiente?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} {...rest}>{pending ? pendiente : children}</button>;
}
