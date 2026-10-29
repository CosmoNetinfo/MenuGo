import { describe, it, expect } from 'vitest';
import {
  calcolaTotaleOrdine,
  getGiornoSettimanaAttuale,
  type CartItemProdotto,
  type CartItemMenuFisso,
  type CartItemPiattoDelGiorno,
  type DefinizioneMenuFisso,
} from '@/lib/pricing';

describe('Modulo Prezzi — calcolaTotaleOrdine()', () => {
  // 1. Prodotti singoli senza opzioni
  it('calcola correttamente prodotti singoli senza opzioni', () => {
    const item1: CartItemProdotto = {
      tipo: 'prodotto',
      prodottoId: 'p-1',
      nome: 'Spaghetti alla Carbonara',
      prezzoUnitarioCentesimi: 1200, // 12,00 €
      quantita: 2,
    };

    const res = calcolaTotaleOrdine([item1]);

    expect(res.isValido).toBe(true);
    expect(res.erroriValidazione).toHaveLength(0);
    expect(res.subtotaleProdottiCentesimi).toBe(2400); // 24,00 €
    expect(res.totaleCentesimi).toBe(2400);
    expect(res.righe).toHaveLength(1);
    expect(res.righe[0].totaleCentesimi).toBe(2400);
  });

  // 2. Prodotti singoli con opzioni e varianti a pagamento (extra)
  it('calcola correttamente prodotti con opzioni a pagamento e gratuite', () => {
    const itemPizza: CartItemProdotto = {
      tipo: 'prodotto',
      prodottoId: 'p-2',
      nome: 'Pizza Margherita',
      prezzoUnitarioCentesimi: 700, // 7,00 €
      quantita: 1,
      opzioni: [
        { opzioneId: 'o-1', nome: 'Doppia Mozzarella', prezzoExtraCentesimi: 150 }, // +1,50 €
        { opzioneId: 'o-2', nome: 'Senza Origano', prezzoExtraCentesimi: 0 },
      ],
    };

    const res = calcolaTotaleOrdine([itemPizza]);

    expect(res.isValido).toBe(true);
    expect(res.subtotaleProdottiCentesimi).toBe(850); // 7,00 + 1,50 = 8,50 €
    expect(res.totaleCentesimi).toBe(850);
    expect(res.righe[0].dettagli).toContain('Doppia Mozzarella (+1,50 €)');
    expect(res.righe[0].dettagli).toContain('Senza Origano');
  });

  // 3. Menu fisso valido
  it('valida e calcola correttamente un menu fisso valido', () => {
    const defMenuPranzo: DefinizioneMenuFisso = {
      id: 'mf-pranzo',
      nome: 'Menu Lavoro',
      prezzoCentesimi: 1300, // 13,00 €
      attivo: true,
      slots: [
        { id: 's-primo', nome: 'Primo', facoltativo: false, categoriaId: 'cat-primi' },
        { id: 's-secondo', nome: 'Secondo', facoltativo: false, categoriaId: 'cat-secondi' },
        { id: 's-contorno', nome: 'Contorno', facoltativo: true, categoriaId: 'cat-contorni' },
      ],
    };

    const itemMenu: CartItemMenuFisso = {
      tipo: 'menu_fisso',
      menuFissoId: 'mf-pranzo',
      nome: 'Menu Lavoro',
      prezzoFissoCentesimi: 1300,
      quantita: 1,
      scelteSlot: [
        { slotId: 's-primo', nomeSlot: 'Primo', prodottoId: 'p-pasta', nomeProdotto: 'Penne al Pomodoro', categoriaId: 'cat-primi' },
        { slotId: 's-secondo', nomeSlot: 'Secondo', prodottoId: 'p-carne', nomeProdotto: 'Arrosto di Vitello', categoriaId: 'cat-secondi' },
        // Slot contorno saltato perché facoltativo
      ],
    };

    const res = calcolaTotaleOrdine([itemMenu], {
      definizioniMenuFissi: { 'mf-pranzo': defMenuPranzo },
    });

    expect(res.isValido).toBe(true);
    expect(res.erroriValidazione).toHaveLength(0);
    expect(res.totaleCentesimi).toBe(1300);
    expect(res.righe[0].dettagli).toEqual([
      'Primo: Penne al Pomodoro',
      'Secondo: Arrosto di Vitello',
    ]);
  });

  // 4. Menu fisso NON valido (manca slot obbligatorio)
  it('segnala errore se manca uno slot obbligatorio nel menu fisso', () => {
    const defMenu: DefinizioneMenuFisso = {
      id: 'mf-1',
      nome: 'Menu Completo',
      prezzoCentesimi: 1500,
      attivo: true,
      slots: [
        { id: 's-1', nome: 'Primo', facoltativo: false },
        { id: 's-2', nome: 'Secondo', facoltativo: false },
      ],
    };

    const itemIncompleto: CartItemMenuFisso = {
      tipo: 'menu_fisso',
      menuFissoId: 'mf-1',
      nome: 'Menu Completo',
      prezzoFissoCentesimi: 1500,
      quantita: 1,
      scelteSlot: [
        { slotId: 's-1', nomeSlot: 'Primo', prodottoId: 'p-1', nomeProdotto: 'Risotto' },
        // Manca s-2 che è obbligatorio
      ],
    };

    const res = calcolaTotaleOrdine([itemIncompleto], {
      definizioniMenuFissi: { 'mf-1': defMenu },
    });

    expect(res.isValido).toBe(false);
    expect(res.erroriValidazione[0]).toContain('Secondo');
  });

  // 5. Piatto del giorno ordinato in giorno consentito vs non consentito
  it('accetta il piatto del giorno se ordinato nel giorno di disponibilità', () => {
    const piatto: CartItemPiattoDelGiorno = {
      tipo: 'piatto_del_giorno',
      piattoId: 'pdg-1',
      nome: 'Cozze alla Marinara',
      prezzoUnitarioCentesimi: 900,
      quantita: 1,
      giorniDisponibilita: [5], // Solo Venerdì (5)
    };

    // Ordine di venerdì (5)
    const resVenerdi = calcolaTotaleOrdine([piatto], { giornoSettimana: 5 });
    expect(resVenerdi.isValido).toBe(true);
    expect(resVenerdi.totaleCentesimi).toBe(900);

    // Ordine di martedì (2)
    const resMartedi = calcolaTotaleOrdine([piatto], { giornoSettimana: 2 });
    expect(resMartedi.isValido).toBe(false);
    expect(resMartedi.erroriValidazione[0]).toContain('non è disponibile');
  });

  // 6. Costo di consegna sommato correttamente
  it('aggiunge il costo di consegna al totale complessivo', () => {
    const item: CartItemProdotto = {
      tipo: 'prodotto',
      prodottoId: 'p-1',
      nome: 'Tagliata di Manzo',
      prezzoUnitarioCentesimi: 1800,
      quantita: 2, // 36,00 €
    };

    const res = calcolaTotaleOrdine([item], { costoConsegnaCentesimi: 350 }); // +3,50 €

    expect(res.isValido).toBe(true);
    expect(res.subtotaleProdottiCentesimi).toBe(3600);
    expect(res.costoConsegnaCentesimi).toBe(350);
    expect(res.totaleCentesimi).toBe(3950);
  });

  // 7. Rifiuta quantità nulle o negative
  it('rifiuta quantità non valide (<= 0)', () => {
    const itemInvalido: CartItemProdotto = {
      tipo: 'prodotto',
      prodottoId: 'p-1',
      nome: 'Tiramisù',
      prezzoUnitarioCentesimi: 500,
      quantita: 0,
    };

    const res = calcolaTotaleOrdine([itemInvalido]);
    expect(res.isValido).toBe(false);
    expect(res.erroriValidazione[0]).toContain('Quantità non valida');
  });

  // 8. Funzione getGiornoSettimanaAttuale rispetta il range 1-7
  it('getGiornoSettimanaAttuale restituisce un valore compreso tra 1 e 7', () => {
    const giorno = getGiornoSettimanaAttuale();
    expect(giorno).toBeGreaterThanOrEqual(1);
    expect(giorno).toBeLessThanOrEqual(7);
  });
});
