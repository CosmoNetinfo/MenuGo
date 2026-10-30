import { describe, it, expect } from 'vitest';

describe('Validazione e Regole Super Admin', () => {
  it('accetta slug validi formati da lettere minuscole, numeri e trattini', () => {
    const slugValidi = ['trattoria-demo', 'pizzeria-da-mario', 'bistrot-12', 'caffe-centrale'];
    for (const slug of slugValidi) {
      const pulito = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      expect(pulito).toBe(slug);
      expect(pulito.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('normalizza e pulisce slug con caratteri non consentiti e spazi', () => {
    const casi = [
      { raw: '  Trattoria Bella!  ', atteso: 'trattoria-bella' },
      { raw: 'Pizzeria---Roma', atteso: 'pizzeria-roma' },
      { raw: '-locale-', atteso: 'locale' },
      { raw: 'Bar & Cucina 2026', atteso: 'bar-cucina-2026' },
    ];

    for (const { raw, atteso } of casi) {
      const pulito = raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      expect(pulito).toBe(atteso);
    }
  });

  it('rifiuta slug troppo corti o vuoti dopo la normalizzazione', () => {
    const nonValidi = ['', '  ', 'a', '!!', '--'];
    for (const raw of nonValidi) {
      const pulito = raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      expect(pulito.length < 3).toBe(true);
    }
  });

  it('gestisce correttamente i piani supportati', () => {
    const pianiValidi = ['base', 'pro', 'enterprise'];
    expect(pianiValidi.includes('base')).toBe(true);
    expect(pianiValidi.includes('pro')).toBe(true);
    expect(pianiValidi.includes('enterprise')).toBe(true);
    expect(pianiValidi.includes('sconosciuto')).toBe(false);
  });
});
