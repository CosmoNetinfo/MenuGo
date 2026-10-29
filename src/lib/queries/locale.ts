import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type FullLocaleData = {
  locale: Database['public']['Tables']['locali']['Row'];
  branding: Database['public']['Tables']['locale_branding']['Row'];
  settings: Database['public']['Tables']['locale_settings']['Row'];
  categorie: Array<
    Database['public']['Tables']['categorie_menu']['Row'] & {
      prodotti: Database['public']['Tables']['prodotti']['Row'][];
    }
  >;
  destinazioni: Array<
    Database['public']['Tables']['destinazioni']['Row'] & {
      fasce: Database['public']['Tables']['fasce_orarie']['Row'][];
    }
  >;
  zoneConsegna: Database['public']['Tables']['zone_consegna']['Row'][];
};

export async function getFullLocaleBySlug(slug: string): Promise<FullLocaleData | null> {
  const supabase = createClient();

  // 1. Trova il locale
  const { data: locale, error: errLocale } = await supabase
    .from('locali')
    .select('*')
    .eq('slug', slug)
    .single();

  if (errLocale || !locale) {
    return null;
  }

  const localeId = locale.id;

  // 2. Carica Branding
  const { data: branding } = await supabase
    .from('locale_branding')
    .select('*')
    .eq('locale_id', localeId)
    .single();

  // Fallback se il branding non è ancora presente
  const safeBranding: Database['public']['Tables']['locale_branding']['Row'] = branding || {
    id: '',
    locale_id: localeId,
    nome: locale.slug,
    slogan: null,
    messaggio_benvenuto: null,
    logo_url: null,
    copertina_url: null,
    colore_primario: '#059669',
    colore_accento: '#ea580c',
    colore_testo_primario: '#ffffff',
    created_at: '',
    updated_at: '',
  };

  // 3. Carica Settings
  const { data: settings } = await supabase
    .from('locale_settings')
    .select('*')
    .eq('locale_id', localeId)
    .single();

  const safeSettings: Database['public']['Tables']['locale_settings']['Row'] = settings || {
    id: '',
    locale_id: localeId,
    modalita: 'vetrina_ordini',
    orario_limite_ordini: '14:00:00',
    orario_limite_giorni_anticipo: 1,
    lunedi_chiude_sabato: false,
    orario_limite_annullamento: '09:00:00',
    accetta_contanti: true,
    accetta_stripe: false,
    commissione_carta_tipo: 'nessuna',
    commissione_carta_valore: 0,
    telefono: null,
    email: null,
    indirizzo: null,
    link_mappa: null,
    link_instagram: null,
    link_facebook: null,
    testo_ricevuta: null,
    testo_privacy: null,
    mesi_conservazione_ordini: 12,
    created_at: '',
    updated_at: '',
  };

  // 4. Carica Categorie e Prodotti ordinati
  const { data: categorie } = await supabase
    .from('categorie_menu')
    .select('*')
    .eq('locale_id', localeId)
    .eq('visibile', true)
    .order('ordine', { ascending: true });

  const { data: prodotti } = await supabase
    .from('prodotti')
    .select('*')
    .eq('locale_id', localeId)
    .eq('disponibile', true)
    .order('ordine', { ascending: true });

  const categorieConProdotti = (categorie || []).map((cat) => ({
    ...cat,
    prodotti: (prodotti || []).filter((p) => p.categoria_id === cat.id),
  }));

  // 5. Carica Destinazioni e Fasce
  const { data: destinazioni } = await supabase
    .from('destinazioni')
    .select('*')
    .eq('locale_id', localeId)
    .eq('attiva', true)
    .order('ordine', { ascending: true });

  const { data: fasce } = await supabase
    .from('fasce_orarie')
    .select('*')
    .eq('locale_id', localeId)
    .eq('attiva', true);

  const destinazioniConFasce = (destinazioni || []).map((dest) => ({
    ...dest,
    fasce: (fasce || []).filter((f) => f.destinazione_id === dest.id),
  }));

  // 6. Zone di consegna
  const { data: zoneConsegna } = await supabase
    .from('zone_consegna')
    .select('*')
    .eq('locale_id', localeId)
    .eq('attiva', true)
    .order('ordine', { ascending: true });

  return {
    locale,
    branding: safeBranding,
    settings: safeSettings,
    categorie: categorieConProdotti,
    destinazioni: destinazioniConFasce,
    zoneConsegna: zoneConsegna || [],
  };
}
