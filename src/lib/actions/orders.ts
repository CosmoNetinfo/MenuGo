'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  calcolaTotaleOrdine,
  type CartItem,
  type DefinizioneMenuFisso,
} from '@/lib/pricing';
import {
  isOrarioLimiteSuperato,
  puoAnnullareOrdine,
  generaCodiceOrdine,
} from '@/lib/order-rules';
import { creaStripeCheckoutSession } from '@/lib/stripe';

export interface CreaOrdineInput {
  localeSlug: string;
  tipoServizio: 'destinazione_programmata' | 'domicilio' | 'ritiro';
  dataConsegna: string; // "YYYY-MM-DD"
  fasciaOraria: string; // es. "12:30 - 13:00"
  indirizzoConsegna?: string;
  destinazioneId?: string;
  nomeCliente: string;
  cognomeCliente: string;
  telefonoCliente: string;
  noteCliente?: string;
  metodoPagamento: 'contanti' | 'carta';
  items: CartItem[];
  zonaConsegnaId?: string;
}

export interface RisultatoCreaOrdine {
  success: boolean;
  errore?: string;
  ordineId?: string;
  codiceOrdine?: string;
  totaleCentesimi?: number;
  redirectUrl?: string;
}

/**
 * Crea un nuovo ordine applicando tutti i controlli di sicurezza e business lato server.
 */
export async function creaOrdineAction(input: CreaOrdineInput): Promise<RisultatoCreaOrdine> {
  const adminClient = createAdminClient();

  // 1. Validazione input anagrafici di base
  if (!input.nomeCliente.trim() || !input.cognomeCliente.trim()) {
    return { success: false, errore: 'Nome e cognome sono obbligatori.' };
  }
  if (!input.telefonoCliente.trim() || input.telefonoCliente.trim().length < 6) {
    return { success: false, errore: 'Inserisci un numero di telefono valido.' };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, errore: 'Il carrello è vuoto.' };
  }

  // 2. Recupera il locale e le impostazioni
  const { data: locale, error: errLocale } = await adminClient
    .from('locali')
    .select('id, slug, stato')
    .eq('slug', input.localeSlug)
    .single();

  if (errLocale || !locale) {
    return { success: false, errore: 'Locale non trovato.' };
  }

  if (locale.stato !== 'attivo') {
    return { success: false, errore: 'Il locale non accetta ordini al momento.' };
  }

  const { data: settings } = await adminClient
    .from('locale_settings')
    .select('*')
    .eq('locale_id', locale.id)
    .single();

  if (settings?.modalita === 'solo_vetrina') {
    return {
      success: false,
      errore: 'Questo locale è attualmente in modalità solo consultazione.',
    };
  }

  // 3. Controllo orario limite di ordinazione
  const settingsRegole = {
    orario_limite_ordini: settings?.orario_limite_ordini || '14:00:00',
    orario_limite_giorni_anticipo: settings?.orario_limite_giorni_anticipo ?? 1,
    lunedi_chiude_sabato: settings?.lunedi_chiude_sabato ?? false,
  };

  const adesso = new Date();
  if (isOrarioLimiteSuperato(input.dataConsegna, settingsRegole, adesso)) {
    return {
      success: false,
      errore: `L'orario limite per ordinare per il giorno ${input.dataConsegna} è superato.`,
    };
  }

  // 4. Controllo calendario giorni
  const { data: giornoChiuso } = await adminClient
    .from('calendario_giorni')
    .select('*')
    .eq('locale_id', locale.id)
    .eq('giorno', input.dataConsegna)
    .eq('stato', 'chiuso')
    .single();

  if (giornoChiuso) {
    return {
      success: false,
      errore: `Il locale è chiuso per la data richiesta: ${giornoChiuso.motivo_chiusura || 'chiusura straordinaria'}.`,
    };
  }

  // 5. Calcolo costo di consegna (se applicabile)
  let costoConsegna = 0;
  if (input.tipoServizio === 'domicilio' && input.zonaConsegnaId) {
    const { data: zona } = await adminClient
      .from('zone_consegna')
      .select('costo')
      .eq('id', input.zonaConsegnaId)
      .eq('locale_id', locale.id)
      .single();

    if (zona) {
      costoConsegna = zona.costo;
    }
  }

  // 6. Ricalcolo rigoroso dei prezzi sul server tramite il modulo unico di pricing
  // Carica i menu fissi per la validazione degli slot
  const { data: dbMenuFissi } = await adminClient
    .from('menu_fissi')
    .select('*, menu_fissi_slot(*)')
    .eq('locale_id', locale.id);

  const definizioniMenuFissi: Record<string, DefinizioneMenuFisso> = {};
  for (const mf of dbMenuFissi || []) {
    definizioniMenuFissi[mf.id] = {
      id: mf.id,
      nome: mf.nome,
      prezzoCentesimi: mf.prezzo,
      attivo: mf.attivo,
      slots: (mf.menu_fissi_slot || []).map((s: { id: string; nome: string; categoria_id: string | null; facoltativo: boolean }) => ({
        id: s.id,
        nome: s.nome,
        categoriaId: s.categoria_id,
        facoltativo: s.facoltativo,
      })),
    };
  }

  const calcolo = calcolaTotaleOrdine(input.items, {
    costoConsegnaCentesimi: costoConsegna,
    definizioniMenuFissi,
  });

  if (!calcolo.isValido) {
    return {
      success: false,
      errore: `Errore nella composizione dell'ordine: ${calcolo.erroriValidazione.join(' ')}`,
    };
  }

  // 7. Snapshot destinazione
  let destinazioneSnapshot: Record<string, unknown> | null = null;
  if (input.tipoServizio === 'destinazione_programmata' && input.destinazioneId) {
    const { data: dest } = await adminClient
      .from('destinazioni')
      .select('id, nome, indirizzo')
      .eq('id', input.destinazioneId)
      .single();

    if (dest) {
      destinazioneSnapshot = { id: dest.id, nome: dest.nome, indirizzo: dest.indirizzo };
    }
  }

  // 8. Genera codice ordine univoco
  let codiceOrdine = generaCodiceOrdine();
  let tentativi = 0;
  while (tentativi < 5) {
    const { data: esiste } = await adminClient
      .from('ordini')
      .select('id')
      .eq('locale_id', locale.id)
      .eq('codice_ordine', codiceOrdine)
      .single();

    if (!esiste) break;
    codiceOrdine = generaCodiceOrdine();
    tentativi++;
  }

  // 9. Inserisci l'ordine
  const { data: nuovoOrdine, error: errInsertOrdine } = await adminClient
    .from('ordini')
    .insert({
      locale_id: locale.id,
      codice_ordine: codiceOrdine,
      tipo_servizio: input.tipoServizio,
      stato: 'in_attesa',
      stato_pagamento: input.metodoPagamento === 'contanti' ? 'in_attesa' : 'in_attesa',
      metodo_pagamento: input.metodoPagamento,
      destinazione_snapshot: destinazioneSnapshot,
      data_consegna: input.dataConsegna,
      fascia_oraria: input.fasciaOraria,
      indirizzo_consegna: input.indirizzoConsegna || null,
      nome_cliente: input.nomeCliente.trim(),
      cognome_cliente: input.cognomeCliente.trim(),
      telefono_cliente: input.telefonoCliente.trim(),
      note_cliente: input.noteCliente?.trim() || null,
      totale: calcolo.totaleCentesimi,
      costo_consegna: calcolo.costoConsegnaCentesimi,
      commissione_pagamento: 0,
    })
    .select('id, codice_ordine, totale')
    .single();

  if (errInsertOrdine || !nuovoOrdine) {
    return {
      success: false,
      errore: `Impossibile registrare l'ordine: ${errInsertOrdine?.message || 'errore database'}`,
    };
  }

  // 10. Inserisci righe ordine con snapshot immutabile
  const righeDaInserire = input.items.map((it) => {
    let totaleRiga = 0;
    let prezzoUnitario = 0;
    let opzioniSnapshot: unknown = null;
    let prodottoId: string | null = null;

    if (it.tipo === 'prodotto') {
      prezzoUnitario = it.prezzoUnitarioCentesimi;
      prodottoId = it.prodottoId;
      const extraOpzioni = (it.opzioni || []).reduce((acc, o) => acc + (o.prezzoExtraCentesimi || 0), 0);
      totaleRiga = (prezzoUnitario + extraOpzioni) * it.quantita;
      opzioniSnapshot = it.opzioni || [];
    } else if (it.tipo === 'menu_fisso') {
      prezzoUnitario = it.prezzoFissoCentesimi;
      totaleRiga = prezzoUnitario * it.quantita;
      opzioniSnapshot = it.scelteSlot;
    } else if (it.tipo === 'piatto_del_giorno') {
      prezzoUnitario = it.prezzoUnitarioCentesimi;
      totaleRiga = prezzoUnitario * it.quantita;
    }

    return {
      locale_id: locale.id,
      ordine_id: nuovoOrdine.id,
      tipo: it.tipo,
      prodotto_id: prodottoId,
      nome_snapshot: it.nome,
      prezzo_unitario_snapshot: prezzoUnitario,
      quantita: it.quantita,
      opzioni_scelte_snapshot: opzioniSnapshot,
      totale_riga: totaleRiga,
    };
  });

  const { error: errRighe } = await adminClient.from('righe_ordine').insert(righeDaInserire);

  if (errRighe) {
    // In caso di errore su righe ordine, rimuovi l'ordine orfano
    await adminClient.from('ordini').delete().eq('id', nuovoOrdine.id);
    return {
      success: false,
      errore: `Errore salvataggio dettaglio ordine: ${errRighe.message}`,
    };
  }

  revalidatePath(`/${input.localeSlug}`);
  revalidatePath('/admin');

  // Gestione sessione Stripe se il cliente ha scelto carta e il locale accetta Stripe
  if (input.metodoPagamento === 'carta' && settings?.accetta_stripe) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const sessionStripe = await creaStripeCheckoutSession({
      ordineId: nuovoOrdine.id,
      codiceOrdine: nuovoOrdine.codice_ordine,
      localeId: locale.id,
      slugLocale: locale.slug,
      nomeLocale: input.localeSlug,
      clienteEmail: null,
      totaleCentesimi: nuovoOrdine.totale,
      righe: righeDaInserire.map((r) => ({
        nome: r.nome_snapshot,
        quantita: r.quantita,
        prezzoUnitarioCentesimi: r.prezzo_unitario_snapshot,
      })),
      commissioneCartaCentesimi: 0,
      origin: siteUrl,
    });

    if (sessionStripe.success && sessionStripe.url) {
      return {
        success: true,
        ordineId: nuovoOrdine.id,
        codiceOrdine: nuovoOrdine.codice_ordine,
        totaleCentesimi: nuovoOrdine.totale,
        redirectUrl: sessionStripe.url,
      };
    }
  }

  return {
    success: true,
    ordineId: nuovoOrdine.id,
    codiceOrdine: nuovoOrdine.codice_ordine,
    totaleCentesimi: nuovoOrdine.totale,
    redirectUrl: `/${input.localeSlug}/ordine/${nuovoOrdine.codice_ordine}`,
  };
}

/**
 * Annulla un ordine se consentito dalle regole orarie.
 */
export async function annullaOrdineAction(
  ordineId: string,
  telefonoCliente: string
): Promise<{ success: boolean; errore?: string }> {
  const adminClient = createAdminClient();

  const { data: ordine, error: errOrd } = await adminClient
    .from('ordini')
    .select('*, locali(slug), locale_id')
    .eq('id', ordineId)
    .single();

  if (errOrd || !ordine) {
    return { success: false, errore: 'Ordine non trovato.' };
  }

  // Verifica telefono per sicurezza
  if (ordine.telefono_cliente.trim() !== telefonoCliente.trim()) {
    return { success: false, errore: 'Numero di telefono non corrispondente.' };
  }

  const { data: settings } = await adminClient
    .from('locale_settings')
    .select('orario_limite_annullamento')
    .eq('locale_id', ordine.locale_id)
    .single();

  const controllo = puoAnnullareOrdine(
    ordine.data_consegna,
    { orario_limite_annullamento: settings?.orario_limite_annullamento || '09:00:00' },
    ordine.stato
  );

  if (!controllo.consentito) {
    return { success: false, errore: controllo.motivo || 'Annullamento non consentito.' };
  }

  const { error: errUpdate } = await adminClient
    .from('ordini')
    .update({ stato: 'annullato' })
    .eq('id', ordineId);

  if (errUpdate) {
    return { success: false, errore: errUpdate.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

/**
 * Recupera i dettagli completi di un ordine per la pagina ricevuta in app.
 */
export async function getOrdineByCodice(slug: string, codiceOrdine: string) {
  const supabase = createClient();

  // 1. Trova locale
  const { data: locale } = await supabase
    .from('locali')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  if (!locale) return null;

  // 2. Trova ordine (usiamo admin client per leggere l'ordine via codice univoco)
  const adminClient = createAdminClient();
  const { data: ordine } = await adminClient
    .from('ordini')
    .select('*, locale_branding(nome, logo_url, colore_primario), locale_settings(telefono, indirizzo, testo_ricevuta, orario_limite_annullamento), righe_ordine(*)')
    .eq('locale_id', locale.id)
    .eq('codice_ordine', codiceOrdine)
    .single();

  return ordine;
}
