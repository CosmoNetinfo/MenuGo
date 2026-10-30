import { describe, it, expect } from 'vitest';
import {
  isOrarioLimiteSuperato,
  puoAnnullareOrdine,
  generaCodiceOrdine,
  creaDataRome,
} from '@/lib/order-rules';

describe('Regole Orarie e Scadenze Ordini — order-rules.ts', () => {
  const settingsBase = {
    orario_limite_ordini: '14:00:00',
    orario_limite_giorni_anticipo: 1, // giorno prima
    lunedi_chiude_sabato: true,
    orario_limite_annullamento: '09:00:00',
  };

  it('consente un ordine per martedì effettuato lunedì alle 11:00 (prima delle 14:00)', () => {
    const dataConsegna = '2026-11-10'; // Martedì
    const adesso = creaDataRome('2026-11-09', '11:00'); // Lunedì ore 11:00

    const superato = isOrarioLimiteSuperato(dataConsegna, settingsBase, adesso);
    expect(superato).toBe(false);
  });

  it('blocca un ordine per martedì effettuato lunedì alle 14:30 (dopo le 14:00)', () => {
    const dataConsegna = '2026-11-10'; // Martedì
    const adesso = creaDataRome('2026-11-09', '14:30'); // Lunedì ore 14:30

    const superato = isOrarioLimiteSuperato(dataConsegna, settingsBase, adesso);
    expect(superato).toBe(true);
  });

  it('regola "il lunedì chiude il sabato": blocca un ordine per lunedì se effettuato domenica', () => {
    const dataConsegna = '2026-11-09'; // Lunedì
    // Con lunedi_chiude_sabato = true, la deadline era sabato 2026-11-07 alle 14:00
    const adessoDomenica = creaDataRome('2026-11-08', '10:00'); // Domenica mattina

    const superato = isOrarioLimiteSuperato(dataConsegna, settingsBase, adessoDomenica);
    expect(superato).toBe(true);
  });

  it('regola "il lunedì chiude il sabato": accetta un ordine per lunedì effettuato sabato prima delle 14:00', () => {
    const dataConsegna = '2026-11-09'; // Lunedì
    const adessoSabato = creaDataRome('2026-11-07', '12:00'); // Sabato ore 12:00

    const superato = isOrarioLimiteSuperato(dataConsegna, settingsBase, adessoSabato);
    expect(superato).toBe(false);
  });

  it('verifica orario limite di annullamento (09:00 del giorno di consegna)', () => {
    const dataConsegna = '2026-11-10';

    // Prima delle 09:00 -> consentito
    const prima = creaDataRome(dataConsegna, '08:30');
    expect(puoAnnullareOrdine(dataConsegna, settingsBase, 'confermato', prima).consentito).toBe(true);

    // Dopo le 09:00 -> respinto
    const dopo = creaDataRome(dataConsegna, '09:15');
    expect(puoAnnullareOrdine(dataConsegna, settingsBase, 'confermato', dopo).consentito).toBe(false);

    // Ordine già in preparazione -> sempre respinto
    expect(puoAnnullareOrdine(dataConsegna, settingsBase, 'in_preparazione', prima).consentito).toBe(false);
  });

  it('generaCodiceOrdine genera un codice con prefisso MG e 4 cifre', () => {
    const codice = generaCodiceOrdine();
    expect(codice).toMatch(/^MG-\d{4}$/);
  });
});
