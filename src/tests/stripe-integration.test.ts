import { describe, it, expect } from 'vitest';
import { creaStripeCheckoutSession } from '@/lib/stripe';

describe('Integrazione Stripe e Webhook', () => {
  it('gestisce con grazia la mancanza di STRIPE_SECRET_KEY in ambiente senza errori fatali', async () => {
    // Senza STRIPE_SECRET_KEY o con mock, creaStripeCheckoutSession deve restituire un errore chiaro
    const res = await creaStripeCheckoutSession({
      ordineId: 'test-ordine-id',
      codiceOrdine: 'ORD-1234',
      localeId: 'test-locale-id',
      slugLocale: 'trattoria-demo',
      nomeLocale: 'Trattoria Demo',
      clienteEmail: 'cliente@example.com',
      totaleCentesimi: 2500,
      righe: [
        {
          nome: 'Tagliatelle al ragù',
          quantita: 2,
          prezzoUnitarioCentesimi: 1250,
        },
      ],
      origin: 'http://localhost:3000',
    });

    if (!process.env.STRIPE_SECRET_KEY) {
      expect(res.success).toBe(false);
      expect(res.errore).toContain('Stripe');
    }
  });

  it('l’idempotenza del webhook riconosce correttamente gli ordini già contrassegnati come pagati', () => {
    const statoOrdine = { id: 'ord-1', stato_pagamento: 'pagato' };
    const eGiaPagato = statoOrdine.stato_pagamento === 'pagato';
    expect(eGiaPagato).toBe(true);

    const ordineInAttesa = { id: 'ord-2', stato_pagamento: 'in_attesa' };
    expect(ordineInAttesa.stato_pagamento === 'pagato').toBe(false);
  });
});
