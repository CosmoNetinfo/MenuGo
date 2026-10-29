import { describe, it, expect } from 'vitest';
import { getContrastRatio, getOptimalTextColor, checkContrast } from './color-utils';

describe('color-utils (WCAG Contrast & Accessibility)', () => {
  it('calcola il massimo contrasto tra bianco e nero', () => {
    const ratio = getContrastRatio('#ffffff', '#000000');
    expect(ratio).toBe(21);
  });

  it('identifica che testo bianco su verde smeraldo scuro ha buon contrasto', () => {
    // #065f46 (emerald-800) vs #ffffff
    const result = checkContrast('#ffffff', '#065f46');
    expect(result.ratio).toBeGreaterThan(4.5);
    expect(result.isAccessible).toBe(true);
  });

  it('segnala contrasto insufficiente per testo chiaro su sfondo chiaro', () => {
    // Giallo chiaro (#fef08a) vs Bianco (#ffffff)
    const result = checkContrast('#ffffff', '#fef08a');
    expect(result.ratio).toBeLessThan(4.5);
    expect(result.isAccessible).toBe(false);
    expect(result.level).toBe('insufficiente');
    // Deve suggerire colore scuro come alternativa
    expect(result.recommendedTextColor).toBe('#0f172a');
  });

  it('determina il colore ottimale del testo (bianco per sfondi scuri, nero per sfondi chiari)', () => {
    expect(getOptimalTextColor('#000000')).toBe('#ffffff');
    expect(getOptimalTextColor('#ffffff')).toBe('#0f172a');
    expect(getOptimalTextColor('#047857')).toBe('#ffffff'); // verde scuro
    expect(getOptimalTextColor('#fef3c7')).toBe('#0f172a'); // ambra chiaro
  });
});
