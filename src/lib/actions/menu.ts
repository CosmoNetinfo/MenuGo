'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Verifica l'utente autenticato e che sia gestore del locale richiesto o super admin.
 */
async function verificaAutorizzazioneLocale(localeId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Accesso non autorizzato. Effettua il login.');
  }

  // Verifica super admin
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
    check_user_id: user.id,
  });

  if (isSuperAdmin) {
    return { supabase, user, isSuperAdmin: true };
  }

  // Verifica se è gestore del locale
  const { data: utenteLocale } = await supabase
    .from('utenti_locale')
    .select('locale_id')
    .eq('user_id', user.id)
    .eq('locale_id', localeId)
    .single();

  if (!utenteLocale) {
    throw new Error('Non sei autorizzato a modificare il menu di questo locale.');
  }

  return { supabase, user, isSuperAdmin: false };
}

// ---------------------------------------------------------------------------
// 1. Categorie Menu
// ---------------------------------------------------------------------------

export async function creaCategoriaAction(
  localeId: string,
  data: { nome: string; descrizione?: string; ordine?: number; visibile?: boolean }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { data: categoria, error } = await supabase
    .from('categorie_menu')
    .insert({
      locale_id: localeId,
      nome: data.nome.trim(),
      descrizione: data.descrizione?.trim() || null,
      ordine: data.ordine ?? 0,
      visibile: data.visibile ?? true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true, categoria };
}

export async function aggiornaCategoriaAction(
  localeId: string,
  categoriaId: string,
  data: { nome?: string; descrizione?: string; ordine?: number; visibile?: boolean }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const updatePayload: Record<string, unknown> = {};
  if (data.nome !== undefined) updatePayload.nome = data.nome.trim();
  if (data.descrizione !== undefined) updatePayload.descrizione = data.descrizione.trim() || null;
  if (data.ordine !== undefined) updatePayload.ordine = data.ordine;
  if (data.visibile !== undefined) updatePayload.visibile = data.visibile;

  const { error } = await supabase
    .from('categorie_menu')
    .update(updatePayload)
    .eq('id', categoriaId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function eliminaCategoriaAction(localeId: string, categoriaId: string) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { error } = await supabase
    .from('categorie_menu')
    .delete()
    .eq('id', categoriaId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 2. Prodotti
// ---------------------------------------------------------------------------

export async function creaProdottoAction(
  localeId: string,
  data: {
    categoriaId: string;
    nome: string;
    descrizione?: string;
    prezzoCentesimi: number;
    fotoUrl?: string;
    allergeni?: number[];
    disponibile?: boolean;
    inEvidenza?: boolean;
    ordine?: number;
  }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { data: prodotto, error } = await supabase
    .from('prodotti')
    .insert({
      locale_id: localeId,
      categoria_id: data.categoriaId,
      nome: data.nome.trim(),
      descrizione: data.descrizione?.trim() || null,
      prezzo: Math.max(0, Math.round(data.prezzoCentesimi)),
      foto_url: data.fotoUrl?.trim() || null,
      allergeni: data.allergeni || [],
      disponibile: data.disponibile ?? true,
      in_evidenza: data.inEvidenza ?? false,
      ordine: data.ordine ?? 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true, prodotto };
}

export async function aggiornaProdottoAction(
  localeId: string,
  prodottoId: string,
  data: {
    categoriaId?: string;
    nome?: string;
    descrizione?: string;
    prezzoCentesimi?: number;
    fotoUrl?: string | null;
    allergeni?: number[];
    disponibile?: boolean;
    inEvidenza?: boolean;
    ordine?: number;
  }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const updatePayload: Record<string, unknown> = {};
  if (data.categoriaId !== undefined) updatePayload.categoria_id = data.categoriaId;
  if (data.nome !== undefined) updatePayload.nome = data.nome.trim();
  if (data.descrizione !== undefined) updatePayload.descrizione = data.descrizione.trim() || null;
  if (data.prezzoCentesimi !== undefined) {
    updatePayload.prezzo = Math.max(0, Math.round(data.prezzoCentesimi));
  }
  if (data.fotoUrl !== undefined) updatePayload.foto_url = data.fotoUrl;
  if (data.allergeni !== undefined) updatePayload.allergeni = data.allergeni;
  if (data.disponibile !== undefined) updatePayload.disponibile = data.disponibile;
  if (data.inEvidenza !== undefined) updatePayload.in_evidenza = data.inEvidenza;
  if (data.ordine !== undefined) updatePayload.ordine = data.ordine;

  const { error } = await supabase
    .from('prodotti')
    .update(updatePayload)
    .eq('id', prodottoId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function eliminaProdottoAction(localeId: string, prodottoId: string) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { error } = await supabase
    .from('prodotti')
    .delete()
    .eq('id', prodottoId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 3. Gruppi Opzioni e Varianti
// ---------------------------------------------------------------------------

export async function creaGruppoOpzioniAction(
  localeId: string,
  data: {
    prodottoId: string;
    nome: string;
    obbligatorio?: boolean;
    sceltaMultipla?: boolean;
    minSelezioni?: number;
    maxSelezioni?: number | null;
    ordine?: number;
  }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { data: gruppo, error } = await supabase
    .from('gruppi_opzioni')
    .insert({
      locale_id: localeId,
      prodotto_id: data.prodottoId,
      nome: data.nome.trim(),
      obbligatorio: data.obbligatorio ?? false,
      scelta_multipla: data.sceltaMultipla ?? false,
      min_selezioni: data.minSelezioni ?? 0,
      max_selezioni: data.maxSelezioni ?? null,
      ordine: data.ordine ?? 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true, gruppo };
}

export async function eliminaGruppoOpzioniAction(localeId: string, gruppoId: string) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { error } = await supabase
    .from('gruppi_opzioni')
    .delete()
    .eq('id', gruppoId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function creaOpzioneAction(
  localeId: string,
  data: {
    gruppoId: string;
    nome: string;
    prezzoExtraCentesimi?: number;
    disponibile?: boolean;
    ordine?: number;
  }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { data: opzione, error } = await supabase
    .from('opzioni')
    .insert({
      locale_id: localeId,
      gruppo_id: data.gruppoId,
      nome: data.nome.trim(),
      prezzo_extra: Math.max(0, Math.round(data.prezzoExtraCentesimi || 0)),
      disponibile: data.disponibile ?? true,
      ordine: data.ordine ?? 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true, opzione };
}

export async function eliminaOpzioneAction(localeId: string, opzioneId: string) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { error } = await supabase
    .from('opzioni')
    .delete()
    .eq('id', opzioneId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. Menu Fissi e Slot
// ---------------------------------------------------------------------------

export async function creaMenuFissoAction(
  localeId: string,
  data: {
    nome: string;
    descrizione?: string;
    prezzoCentesimi: number;
    attivo?: boolean;
    slots: Array<{
      nome: string;
      categoriaId?: string;
      facoltativo?: boolean;
      ordine?: number;
    }>;
  }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { data: menuFisso, error: errMenu } = await supabase
    .from('menu_fissi')
    .insert({
      locale_id: localeId,
      nome: data.nome.trim(),
      descrizione: data.descrizione?.trim() || null,
      prezzo: Math.max(0, Math.round(data.prezzoCentesimi)),
      attivo: data.attivo ?? true,
    })
    .select()
    .single();

  if (errMenu || !menuFisso) {
    return { success: false, errore: errMenu?.message || 'Errore creazione menu fisso' };
  }

  if (data.slots && data.slots.length > 0) {
    const slotsPayload = data.slots.map((s, idx) => ({
      locale_id: localeId,
      menu_fisso_id: menuFisso.id,
      nome: s.nome.trim(),
      categoria_id: s.categoriaId || null,
      facoltativo: s.facoltativo ?? false,
      ordine: s.ordine ?? idx,
    }));

    const { error: errSlots } = await supabase
      .from('menu_fissi_slot')
      .insert(slotsPayload);

    if (errSlots) {
      return { success: false, errore: `Menu creato, ma errore negli slot: ${errSlots.message}` };
    }
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true, menuFisso };
}

export async function eliminaMenuFissoAction(localeId: string, menuFissoId: string) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { error } = await supabase
    .from('menu_fissi')
    .delete()
    .eq('id', menuFissoId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. Piatti del Giorno (Fuori Menu)
// ---------------------------------------------------------------------------

export async function creaPiattoDelGiornoAction(
  localeId: string,
  data: {
    nome: string;
    descrizione?: string;
    prezzoCentesimi: number;
    fotoUrl?: string;
    allergeni?: number[];
    giorniDisponibilita: number[];
    attivo?: boolean;
  }
) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { data: piatto, error } = await supabase
    .from('piatti_del_giorno')
    .insert({
      locale_id: localeId,
      nome: data.nome.trim(),
      descrizione: data.descrizione?.trim() || null,
      prezzo: Math.max(0, Math.round(data.prezzoCentesimi)),
      foto_url: data.fotoUrl?.trim() || null,
      allergeni: data.allergeni || [],
      giorni_disponibilita: data.giorniDisponibilita || [1, 2, 3, 4, 5, 6, 7],
      attivo: data.attivo ?? true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true, piatto };
}

export async function eliminaPiattoDelGiornoAction(localeId: string, piattoId: string) {
  const { supabase } = await verificaAutorizzazioneLocale(localeId);

  const { error } = await supabase
    .from('piatti_del_giorno')
    .delete()
    .eq('id', piattoId)
    .eq('locale_id', localeId);

  if (error) {
    return { success: false, errore: error.message };
  }

  revalidatePath('/admin/menu');
  revalidatePath('/', 'layout');
  return { success: true };
}
