import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea segundos a mm:ss
 * LOW-02: Valida inputs inválidos (NaN, Infinity, negativos)
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formatea una fecha ISO a formato legible
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Traduce estados de maqueta a español legible
 */
export function translateDraftStatus(status: string): string {
  const map: Record<string, string> = {
    borrador: "Borrador",
    en_mezcla: "En mezcla",
    masterizada: "Masterizada",
    lista_para_publicar: "Lista para publicar",
  };
  return map[status] || status;
}

/**
 * Traduce estados de collab a español legible
 * LOW-03: Fix typo "grabacion" → "grabación"
 */
export function translateCollabStatus(status: string): string {
  const map: Record<string, string> = {
    propuesta_enviada: "Propuesta enviada",
    en_grabacion: "En grabación",
    recibido: "Recibido",
    mezclando: "Mezclando",
    listo: "Listo",
  };
  return map[status] || status;
}

/**
 * Colores por tipo de evento del calendario
 */
export function getEventColor(type: string): string {
  const map: Record<string, string> = {
    lanzamiento: "bg-green-500",
    sesion_grabacion: "bg-blue-500",
    evento_musical: "bg-purple-500",
    reunion: "bg-yellow-500",
    otro: "bg-gray-500",
  };
  return map[type] || "bg-gray-500";
}
