/**
 * Convierte una URL de imagen a una ruta que funcione correctamente.
 * - URLs externas (http/https) → pasan por el proxy /api/avatar
 * - URLs locales → se usan directamente
 */
export function getImageUrl(url: string): string {
  // Si la URL empieza con http o https, es externa y necesita proxy
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/avatar?url=${encodeURIComponent(url)}`;
  }
  
  // URLs locales se usan directamente
  return url;
}
