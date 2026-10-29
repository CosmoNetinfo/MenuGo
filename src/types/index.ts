/**
 * Tipi base dell'applicazione MenuGo
 */

export type LocaleId = string;

export interface BrandConfig {
  name: string;
  tagline: string;
  version: string;
  defaultLocale: string;
  currency: string;
  timeZone: string;
}
