/**
 * Utility per calcolo del contrasto cromatico conforme a WCAG 2.1
 * Utilizzato per il controllo e suggerimento dell'accessibilità dei colori nei locali
 */

export interface ContrastResult {
  ratio: number;
  isAccessible: boolean; // >= 4.5:1 per testo normale
  level: 'AAA' | 'AA' | 'insufficiente';
  recommendedTextColor: string;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

function sRgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const r = sRgbToLinear(rgb.r);
  const g = sRgbToLinear(rgb.g);
  const b = sRgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (brighter + 0.05) / (darker + 0.05);
  return Number(ratio.toFixed(2));
}

export function getOptimalTextColor(backgroundHex: string): string {
  const rgb = hexToRgb(backgroundHex);
  if (!rgb) return '#000000';

  const luminance = getRelativeLuminance(rgb);
  // Se la luminanza è superiore a 0.179, il testo scuro garantisce contrasto migliore
  return luminance > 0.179 ? '#0f172a' : '#ffffff';
}

export function checkContrast(textHex: string, backgroundHex: string): ContrastResult {
  const ratio = getContrastRatio(textHex, backgroundHex);
  const recommendedTextColor = getOptimalTextColor(backgroundHex);

  let level: 'AAA' | 'AA' | 'insufficiente' = 'insufficiente';
  if (ratio >= 7) {
    level = 'AAA';
  } else if (ratio >= 4.5) {
    level = 'AA';
  }

  return {
    ratio,
    isAccessible: ratio >= 4.5,
    level,
    recommendedTextColor,
  };
}
