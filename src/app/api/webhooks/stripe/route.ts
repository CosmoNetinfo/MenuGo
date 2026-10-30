import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook non configurato (manca STRIPE_WEBHOOK_SECRET)' },
      { status: 400 }
    );
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Firma stripe-signature mancante' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore validazione firma';
    return NextResponse.json({ error: `Webhook signature non valida: ${msg}` }, { status: 400 });
  }

  const adminClient = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const ordineId = session.metadata?.ordine_id;

      if (!ordineId) {
        return NextResponse.json({ received: true, warning: 'Metadata ordine_id assente' });
      }

      // Controllo di Idempotenza: verifica se già pagato
      const { data: ordine } = await adminClient
        .from('ordini')
        .select('id, stato_pagamento')
        .eq('id', ordineId)
        .maybeSingle();

      if (!ordine) {
        return NextResponse.json({ received: true, warning: 'Ordine non trovato' });
      }

      if (ordine.stato_pagamento === 'pagato') {
        // Già processato con successo
        return NextResponse.json({ received: true, idempotente: true });
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null;

      await adminClient
        .from('ordini')
        .update({
          stato_pagamento: 'pagato',
          id_transazione_stripe: paymentIntentId,
        })
        .eq('id', ordineId);

      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (paymentIntentId) {
        await adminClient
          .from('ordini')
          .update({
            stato_pagamento: 'rimborsato',
          })
          .eq('id_transazione_stripe', paymentIntentId);
      }
      break;
    }

    default:
      // Ignora altri eventi senza fallire
      break;
  }

  return NextResponse.json({ received: true });
}
