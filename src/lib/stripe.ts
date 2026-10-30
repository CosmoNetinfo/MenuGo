import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
      typescript: true,
    })
  : null;

export interface CreaCheckoutSessionParams {
  ordineId: string;
  codiceOrdine: string;
  localeId: string;
  slugLocale: string;
  nomeLocale: string;
  clienteEmail?: string | null;
  totaleCentesimi: number;
  righe: Array<{
    nome: string;
    quantita: number;
    prezzoUnitarioCentesimi: number;
  }>;
  commissioneCartaCentesimi?: number;
  origin: string;
}

/**
 * Crea una sessione Stripe Checkout per l'ordine
 */
export async function creaStripeCheckoutSession(params: CreaCheckoutSessionParams) {
  if (!stripe) {
    return {
      success: false,
      errore: 'Stripe non è configurato sulla piattaforma (manca STRIPE_SECRET_KEY).',
    };
  }

  try {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = params.righe.map((riga) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: riga.nome,
        },
        unit_amount: riga.prezzoUnitarioCentesimi,
      },
      quantity: riga.quantita,
    }));

    if (params.commissioneCartaCentesimi && params.commissioneCartaCentesimi > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Supplemento gestione pagamento elettronico',
          },
          unit_amount: params.commissioneCartaCentesimi,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: params.clienteEmail || undefined,
      line_items: lineItems,
      metadata: {
        ordine_id: params.ordineId,
        codice_ordine: params.codiceOrdine,
        locale_id: params.localeId,
        slug_locale: params.slugLocale,
      },
      success_url: `${params.origin}/${params.slugLocale}/ordine/${params.codiceOrdine}?stripe=successo&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.origin}/${params.slugLocale}/ordine/${params.codiceOrdine}?stripe=annullato`,
    });

    return {
      success: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore Stripe sconosciuto';
    return {
      success: false,
      errore: message,
    };
  }
}

/**
 * Esegue il rimborso di una transazione Stripe
 */
export async function rimborsaTransazioneStripe(paymentIntentId: string, motivo?: string) {
  if (!stripe) {
    return {
      success: false,
      errore: 'Stripe non è configurato.',
    };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: { motivo: motivo || 'Richiesto dal gestore o annullamento ordine' },
    });

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore rimborso';
    return {
      success: false,
      errore: message,
    };
  }
}
