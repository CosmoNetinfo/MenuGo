import { describe, it, expect } from 'vitest';
import { checkContrast, getOptimalTextColor } from '@/lib/color-utils';
import { formatPrice, formatDateItalian } from '@/lib/formatters';

describe('Vetrina e Branding (Fase 2)', () => {
  it('il controllo contrasto garantisce la conformità WCAG per i colori del brand', () => {
    // Smeraldo scuro (#065f46) con testo bianco
    const contrast = checkContrast('#ffffff', '#065f46');
    expect(contrast.isAccessible).toBe(true);
    expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);

    // Contrasto scarso: testo grigio chiaro su bianco
    const badContrast = checkContrast('#d1d5db', '#ffffff');
    expect(badContrast.isAccessible).toBe(false);
    expect(badContrast.level).toBe('insufficiente');
  });

  it('determina il colore ottimale del testo in base alla luminanza dello sfondo', () => {
    expect(getOptimalTextColor('#ffffff')).toBe('#0f172a');
    expect(getOptimalTextColor('#000000')).toBe('#ffffff');
  });

  it('formatta correttamente i prezzi in centesimi secondo lo standard italiano', () => {
    const p1 = formatPrice(1050).replace(/\u00a0/g, ' ');
    expect(p1).toBe('10,50 €');

    const p2 = formatPrice(500).replace(/\u00a0/g, ' ');
    expect(p2).toBe('5,00 €');
  });

  it('formatta le date in italiano con mese in minuscolo', () => {
    const formatted = formatDateItalian('2026-10-29T12:00:00Z');
    expect(formatted).toContain('ottobre');
  });
});
