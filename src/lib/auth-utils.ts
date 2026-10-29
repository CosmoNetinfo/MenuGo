/**
 * Utility pure per autenticazione e sicurezza URL.
 */

/**
 * Valida un percorso di reindirizzamento per prevenire attacchi di Open Redirect.
 * Accetta solo percorsi interni che iniziano con un singolo '/' (non '//', non 'http', non '\').
 * In ogni altro caso o valore non valido, restituisce '/admin'.
 */
export function percorsoSicuro(destinazione?: string | null): string {
  if (!destinazione || typeof destinazione !== 'string') {
    return '/admin';
  }

  const trimmed = destinazione.trim();

  // Rifiuta percorsi che non iniziano con '/', che iniziano con '//' o '/\',
  // che contengono '\', o che includono uno schema come http:// o https://
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return '/admin';
  }

  return trimmed;
}
