'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

async function verificaSuperAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Non autenticato');

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
    check_user_id: user.id,
  });

  if (!isSuperAdmin) throw new Error('Accesso non autorizzato: permessi insufficienti');

  return user;
}

function generaPasswordSicura(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pwd = '';
  const randomBytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    pwd += chars[randomBytes[i] % chars.length];
  }
  return pwd;
}

export interface CreaLocaleInput {
  nome: string;
  slug: string;
  emailGestore: string;
  piano: string;
  creaMenuEsempio?: boolean;
}

export async function creaNuovoLocaleAction(input: CreaLocaleInput) {
  await verificaSuperAdmin();
  const adminClient = createAdminClient();

  // Normalizza e valida slug
  const cleanSlug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanSlug || cleanSlug.length < 3) {
    return { success: false, errore: 'Lo slug deve contenere almeno 3 caratteri alfanumerici (lettere minuscole, numeri e trattini).' };
  }

  // Verifica unicità slug
  const { data: esistente } = await adminClient
    .from('locali')
    .select('id')
    .eq('slug', cleanSlug)
    .maybeSingle();

  if (esistente) {
    return { success: false, errore: `Lo slug "${cleanSlug}" è già occupato da un altro locale.` };
  }

  // Genera password casuale per il gestore
  const passwordGenerata = generaPasswordSicura();

  // Crea utente Auth in Supabase
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email: input.emailGestore.trim(),
    password: passwordGenerata,
    email_confirm: true,
  });

  if (authErr) {
    return { success: false, errore: `Impossibile creare l'utente gestore: ${authErr.message}` };
  }

  const userId = authData.user.id;

  // 1. Inserisce record locale
  const { data: nuovoLocale, error: localeErr } = await adminClient
    .from('locali')
    .insert({
      slug: cleanSlug,
      stato: 'attivo',
      piano: input.piano || 'base',
    })
    .select('id')
    .single();

  if (localeErr || !nuovoLocale) {
    // Rollback user
    await adminClient.auth.admin.deleteUser(userId);
    return { success: false, errore: `Errore creazione locale: ${localeErr?.message}` };
  }

  const localeId = nuovoLocale.id;

  // 2. Inserisce branding iniziale
  await adminClient.from('locale_branding').insert({
    locale_id: localeId,
    nome: input.nome.trim(),
    slogan: 'Autentica cucina e prodotti selezionati',
    messaggio_benvenuto: `Benvenuti da ${input.nome.trim()}! Scopri le nostre specialità artigianali.`,
    colore_primario: '#16a34a',
    colore_accento: '#f97316',
    colore_testo_primario: '#ffffff',
  });

  // 3. Inserisce impostazioni di default
  await adminClient.from('locale_settings').insert({
    locale_id: localeId,
    modalita: 'vetrina_ordini',
    orario_limite_ordini: '14:00:00',
    orario_limite_giorni_anticipo: 0,
    lunedi_chiude_sabato: true,
    orario_limite_annullamento: '09:00:00',
    accetta_contanti: true,
    accetta_stripe: false,
    commissione_carta_tipo: 'nessuna',
    commissione_carta_valore: 0,
    testo_ricevuta: `Grazie per aver ordinato da ${input.nome.trim()}!`,
    mesi_conservazione_ordini: 12,
  });

  // 4. Associa gestore al locale
  await adminClient.from('utenti_locale').insert({
    locale_id: localeId,
    user_id: userId,
    ruolo: 'gestore',
  });

  // 5. Menu di esempio facoltativo
  if (input.creaMenuEsempio) {
    const { data: catAntipasti } = await adminClient
      .from('categorie')
      .insert({
        locale_id: localeId,
        nome: 'Antipasti della Casa',
        ordinamento: 0,
        attiva: true,
      })
      .select('id')
      .single();

    const { data: catPrimi } = await adminClient
      .from('categorie')
      .insert({
        locale_id: localeId,
        nome: 'Primi Piatti Tradizionali',
        ordinamento: 1,
        attiva: true,
      })
      .select('id')
      .single();

    if (catAntipasti) {
      await adminClient.from('prodotti').insert([
        {
          locale_id: localeId,
          categoria_id: catAntipasti.id,
          nome: 'Tagliere di Salumi e Formaggi',
          descrizione: 'Selezione di salumi tipici artigianali e formaggi locali stagionati.',
          prezzo: 1200, // 12,00 €
          ordinamento: 0,
          disponibile: true,
        },
        {
          locale_id: localeId,
          categoria_id: catAntipasti.id,
          nome: 'Bruschette al Pomodoro Fresco',
          descrizione: 'Pane casereccio tostato con pomodorini di stagione, basilico e olio EVO.',
          prezzo: 650, // 6,50 €
          ordinamento: 1,
          disponibile: true,
          allergeni: [1], // Glutine
        },
      ]);
    }

    if (catPrimi) {
      await adminClient.from('prodotti').insert([
        {
          locale_id: localeId,
          categoria_id: catPrimi.id,
          nome: 'Tagliolini ai Funghi Porcini',
          descrizione: 'Pasta all uovo fresca tirata a mano con porcini nostrani e prezzemolo.',
          prezzo: 1400, // 14,00 €
          ordinamento: 0,
          disponibile: true,
          allergeni: [1, 3], // Glutine, Uova
        },
      ]);
    }
  }

  // Stampa su console terminale le credenziali (mai scritte in file o su repo)
  console.log(`\n======================================================`);
  console.log(` NUOVO LOCALE CREATO: ${input.nome} (/${cleanSlug})`);
  console.log(` GESTORE: ${input.emailGestore}`);
  console.log(` PASSWORD: ${passwordGenerata}`);
  console.log(`======================================================\n`);

  revalidatePath('/super');
  revalidatePath(`/${cleanSlug}`);

  return {
    success: true,
    localeId,
    slug: cleanSlug,
    credenziali: {
      email: input.emailGestore,
      password: passwordGenerata,
    },
  };
}

export async function cambiaStatoLocaleAction(localeId: string, nuovoStato: 'attivo' | 'sospeso') {
  await verificaSuperAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('locali')
    .update({ stato: nuovoStato })
    .eq('id', localeId);

  if (error) return { success: false, errore: error.message };

  revalidatePath('/super');
  return { success: true };
}

export async function cambiaPianoLocaleAction(localeId: string, nuovoPiano: string) {
  await verificaSuperAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('locali')
    .update({ piano: nuovoPiano.trim().toLowerCase() })
    .eq('id', localeId);

  if (error) return { success: false, errore: error.message };

  revalidatePath('/super');
  return { success: true };
}
