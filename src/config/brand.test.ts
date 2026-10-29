import { describe, it, expect } from 'vitest';
import { BRAND_CONFIG } from './brand';

describe('BRAND_CONFIG', () => {
  it('ha come nome prodotto MenuGo', () => {
    expect(BRAND_CONFIG.name).toBe('MenuGo');
  });

  it('imposta la valuta a EUR e fuso orario Europe/Rome', () => {
    expect(BRAND_CONFIG.currency).toBe('EUR');
    expect(BRAND_CONFIG.timeZone).toBe('Europe/Rome');
  });
});
