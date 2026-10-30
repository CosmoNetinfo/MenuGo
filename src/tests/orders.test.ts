import { describe, it, expect } from 'vitest';
import { isOrarioLimiteSuperato, puoAnnullareOrdine, creaDataRome } from '@/lib/order-rules';
import { calcolaTotaleOrdine, type CartItemProdotto } from '@/lib/pricing';

describe('Flusso e Logica di Ordinazione Cliente — Fase 4', () => {
  const settingsLocale = {
    orario_limite_ordini: '14:00:00',
    orario_limite_giorni_anticipo: 1,
    lunedi_chiude_sabato: true,
    orario_limite_annullamento: '09:00:00',
  };

  it('un ordine calcola correttamente il totale con righe e opzioni', () => {
    const carrello: CartItemProdotto[] = [
      {
        tipo: 'prodotto',
        prodottoId: 'prod-1',
        nome: 'Lasagna alla Bolognese',
        prezzoUnitarioCentesimi: 1100, // 11,00 €
        quantita: 2,
        opzioni: [{ opzioneId: 'opz-1', nome: 'Porzione Extra', prezzoExtraCentesimi: 200 }],
      },
    ];

    const risultato = calcolaTotaleOrdine(carrello, { costoConsegnaCentesimi: 250 });

    expect(risultato.isValido).toBe(true);
    // (1100 + 200) * 2 = 2600 + 250 = 2850
    expect(risultato.subtotaleProdottiCentesimi).toBe(2600);
    expect(risultato.costoConsegnaCentesimi).toBe(250);
    expect(risultato.totaleCentesimi).toBe(2850);
  });

  it('blocca l’ordine se l’orario limite è scaduto', () => {
    const dataConsegna = '2026-11-12'; // Giovedì
    // Invio ordine Mercoledì 11 alle 15:30 (oltre le 14:00)
    const adessoOltreLimite = creaDataRome('2026-11-11', '15:30');

    const superato = isOrarioLimiteSuperato(dataConsegna, settingsLocale, adessoOltreLimite);
    expect(superato).toBe(true);
  });

  it('consente l’ordine se effettuato entro l’orario limite', () => {
    const dataConsegna = '2026-11-12'; // Giovedì
    // Invio ordine Mercoledì 11 alle 10:00 (prima delle 14:00)
    const adessoValido = creaDataRome('2026-11-11', '10:00');

    const superato = isOrarioLimiteSuperato(dataConsegna, settingsLocale, adessoValido);
    expect(superato).toBe(false);
  });

  it('consente l’annullamento prima delle 09:00 del giorno di consegna', () => {
    const dataConsegna = '2026-11-12';
    const adessoConsentito = creaDataRome(dataConsegna, '08:45');

    const esito = puoAnnullareOrdine(dataConsegna, settingsLocale, 'in_attesa', adessoConsentito);
    expect(esito.consentito).toBe(true);
  });

  it('rifiuta l’annullamento dopo le 09:00 del giorno di consegna', () => {
    const dataConsegna = '2026-11-12';
    const adessoScaduto = creaDataRome(dataConsegna, '09:05');

    const esito = puoAnnullareOrdine(dataConsegna, settingsLocale, 'in_attesa', adessoScaduto);
    expect(esito.consentito).toBe(false);
    expect(esito.motivo).toContain('superato');
  });

  it('rifiuta sempre l’annullamento se l’ordine è già in preparazione o completato', () => {
    const dataConsegna = '2026-11-12';
    const adesso = creaDataRome(dataConsegna, '08:00');

    const esitoPrep = puoAnnullareOrdine(dataConsegna, settingsLocale, 'in_preparazione', adesso);
    expect(esitoPrep.consentito).toBe(false);

    const esitoCompl = puoAnnullareOrdine(dataConsegna, settingsLocale, 'completato', adesso);
    expect(esitoCompl.consentito).toBe(false);
  });
});
