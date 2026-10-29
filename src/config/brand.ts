/**
 * Configurazione globale del brand del prodotto MenuGo.
 * 
 * NOTA REGOLA 4:
 * L'unica cosa fissa nel codice dell'applicazione è il nome del prodotto "MenuGo".
 * Tutti gli altri dati visibili dai clienti finali (nome del locale, logo, colori,
 * testi, orari, menu, prezzi, ecc.) sono memorizzati nel database e gestibili
 * tramite il pannello di controllo.
 */

export const BRAND_CONFIG = {
  name: 'MenuGo',
  tagline: 'Vetrina e ordini online per ristoranti e locali di ristorazione',
  version: '0.1.0',
  defaultLocale: 'it-IT',
  currency: 'EUR',
  timeZone: 'Europe/Rome',
} as const;
