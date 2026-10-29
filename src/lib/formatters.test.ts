import { describe, it, expect } from 'vitest';
import { formatPrice, formatDateItalian, formatTimeItalian, ALLERGENI_UE } from './formatters';

describe('formatters', () => {
  it('formatta correttamente gli importi in centesimi in formato valuta italiana', () => {
    // 1500 centesimi -> 15,00 €
    const formatted = formatPrice(1500).replace(/\u00a0/g, ' ');
    expect(formatted).toContain('15,00');
    expect(formatted).toContain('€');

    // 850 centesimi -> 8,50 €
    const formatted850 = formatPrice(850).replace(/\u00a0/g, ' ');
    expect(formatted850).toContain('8,50');

    // 0 centesimi -> 0,00 €
    const formatted0 = formatPrice(0).replace(/\u00a0/g, ' ');
    expect(formatted0).toContain('0,00');
  });

  it('formatta l\'orario in ore:minuti', () => {
    expect(formatTimeItalian('14:30:00')).toBe('14:30');
    expect(formatTimeItalian('09:00:00')).toBe('09:00');
  });

  it('formatta la data in minuscolo con fuso Europe/Rome', () => {
    const formatted = formatDateItalian('2026-10-06T12:00:00Z');
    // Deve contenere "ottobre" in minuscolo
    expect(formatted).toContain('ottobre');
  });

  it('include tutti i 14 allergeni ufficiali UE', () => {
    expect(Object.keys(ALLERGENI_UE).length).toBe(14);
    expect(ALLERGENI_UE[1].nome.toLowerCase()).toContain('glutine');
    expect(ALLERGENI_UE[7].nome.toLowerCase()).toContain('latte');
  });
});
