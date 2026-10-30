'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verificaGestore(localeId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Accesso negato. Effettua il login.');

  const { data: isSuper } = await supabase.rpc('is_super_admin', { check_user_id: user.id });
  if (isSuper) return { supabase, user };

  const { data: gestore } = await supabase
    .from('utenti_locale')
    .select('locale_id')
    .eq('user_id', user.id)
    .eq('locale_id', localeId)
    .single();

  if (!gestore) throw new Error('Non sei autorizzato a gestire questo locale.');
  return { supabase, user };
}

/**
 * Aggiorna stato di un ordine (es. in_preparazione, completato, annullato)
 */
export async function aggiornaStatoOrdineAction(
  localeId: string,
  ordineId: string,
  nuovoStato: 'in_attesa' | 'confermato' | 'in_preparazione' | 'completato' | 'annullato'
) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('ordini')
    .update({ stato: nuovoStato })
    .eq('id', ordineId)
    .eq('locale_id', localeId);

  if (error) return { success: false, errore: error.message };

  revalidatePath('/admin');
  revalidatePath('/admin/ordini');
  return { success: true };
}

/**
 * Aggiorna stato pagamento (es. 'pagato' = contanti ricevuti, 'non_pagato')
 */
export async function aggiornaStatoPagamentoAction(
  localeId: string,
  ordineId: string,
  nuovoStatoPagamento: 'in_attesa' | 'pagato' | 'non_pagato' | 'rimborsato'
) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('ordini')
    .update({ stato_pagamento: nuovoStatoPagamento })
    .eq('id', ordineId)
    .eq('locale_id', localeId);

  if (error) return { success: false, errore: error.message };

  revalidatePath('/admin');
  revalidatePath('/admin/ordini');
  return { success: true };
}

/**
 * Imposta stato giorno nel calendario (automatico, aperto, chiuso)
 */
export async function salvaCalendarioGiornoAction(
  localeId: string,
  giorno: string, // YYYY-MM-DD
  stato: 'automatico' | 'aperto' | 'chiuso',
  motivoChiusura?: string
) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  // Controlla quanti ordini esistono per quel giorno
  const { count } = await adminClient
    .from('ordini')
    .select('id', { count: 'exact', head: true })
    .eq('locale_id', localeId)
    .eq('data_consegna', giorno)
    .neq('stato', 'annullato');

  if (stato === 'automatico') {
    await adminClient
      .from('calendario_giorni')
      .delete()
      .eq('locale_id', localeId)
      .eq('giorno', giorno)
      .is('destinazione_id', null);
  } else {
    await adminClient
      .from('calendario_giorni')
      .upsert(
        {
          locale_id: localeId,
          giorno,
          stato,
          motivo_chiusura: motivoChiusura || null,
          destinazione_id: null,
        },
        { onConflict: 'locale_id, giorno' }
      );
  }

  revalidatePath('/admin/calendario');
  revalidatePath('/api/availability');
  return { success: true, ordiniEsistenti: count || 0 };
}

/**
 * Salva impostazioni generali e regole orarie
 */
export async function salvaImpostazioniLocaleAction(
  localeId: string,
  settingsPayload: {
    modalita?: 'solo_vetrina' | 'vetrina_ordini';
    orario_limite_ordini?: string;
    orario_limite_giorni_anticipo?: number;
    lunedi_chiude_sabato?: boolean;
    orario_limite_annullamento?: string;
    accetta_contanti?: boolean;
    accetta_stripe?: boolean;
    commissione_carta_tipo?: 'nessuna' | 'fissa' | 'percentuale';
    commissione_carta_valore?: number;
    telefono?: string | null;
    email?: string | null;
    indirizzo?: string | null;
    link_mappa?: string | null;
    link_instagram?: string | null;
    link_facebook?: string | null;
    testo_ricevuta?: string | null;
    testo_privacy?: string | null;
    mesi_conservazione_ordini?: number;
  }
) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('locale_settings')
    .update(settingsPayload)
    .eq('locale_id', localeId);

  if (error) return { success: false, errore: error.message };

  revalidatePath('/admin');
  revalidatePath('/admin/impostazioni');
  revalidatePath('/admin/servizio');
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Gestione Zone di Consegna (aggiunta ed eliminazione)
 */
export async function creaZonaConsegnaAction(localeId: string, nome: string, costoCentesimi: number) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient.from('zone_consegna').insert({
    locale_id: localeId,
    nome: nome.trim(),
    costo: Math.max(0, Math.round(costoCentesimi)),
    attiva: true,
  });

  if (error) return { success: false, errore: error.message };
  revalidatePath('/admin/servizio');
  return { success: true };
}

export async function toggleZonaConsegnaAction(localeId: string, zonaId: string, attivaAttuale: boolean) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('zone_consegna')
    .update({ attiva: !attivaAttuale })
    .eq('id', zonaId)
    .eq('locale_id', localeId);

  if (error) return { success: false, errore: error.message };
  revalidatePath('/admin/servizio');
  return { success: true };
}

export async function eliminaZonaConsegnaAction(localeId: string, zonaId: string) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('zone_consegna')
    .delete()
    .eq('id', zonaId)
    .eq('locale_id', localeId);

  if (error) return { success: false, errore: error.message };
  revalidatePath('/admin/servizio');
  return { success: true };
}

/**
 * Gestione Destinazioni Programmate
 */
export async function creaDestinazioneAction(localeId: string, nome: string, indirizzo?: string) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient.from('destinazioni').insert({
    locale_id: localeId,
    nome: nome.trim(),
    indirizzo: indirizzo?.trim() || null,
    attiva: true,
  });

  if (error) return { success: false, errore: error.message };
  revalidatePath('/admin/servizio');
  return { success: true };
}

export async function toggleDestinazioneAction(localeId: string, destId: string, attivaAttuale: boolean) {
  await verificaGestore(localeId);
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('destinazioni')
    .update({ attiva: !attivaAttuale })
    .eq('id', destId)
    .eq('locale_id', localeId);

  if (error) return { success: false, errore: error.message };
  revalidatePath('/admin/servizio');
  return { success: true };
}
