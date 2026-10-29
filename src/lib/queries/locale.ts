import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export type ProdottoConOpzioni = Database['public']['Tables']['prodotti']['Row'] & {
  gruppiOpzioni: Array<
    Database['public']['Tables']['gruppi_opzioni']['Row'] & {
      opzioni: Database['public']['Tables']['opzioni']['Row'][];
    }
  >;
};

export type CategoriaConProdotti = Database['public']['Tables']['categorie_menu']['Row'] & {
  prodotti: ProdottoConOpzioni[];
};

export type MenuFissoConSlot = Database['public']['Tables']['menu_fissi']['Row'] & {
  slots: Database['public']['Tables']['menu_fissi_slot']['Row'][];
};

export type FullLocaleData = {
  locale: Database['public']['Tables']['locali']['Row'];
  branding: Database['public']['Tables']['locale_branding']['Row'];
  settings: Database['public']['Tables']['locale_settings']['Row'];
  categorie: CategoriaConProdotti[];
  menuFissi: MenuFissoConSlot[];
  piattiDelGiorno: Database['public']['Tables']['piatti_del_giorno']['Row'][];
  destinazioni: Array<
    Database['public']['Tables']['destinazioni']['Row'] & {
      fasce: Database['public']['Tables']['fasce_orarie']['Row'][];
    }
  >;
  zoneConsegna: Database['public']['Tables']['zone_consegna']['Row'][];
};

export async function getFullLocaleBySlug(
  slug: string,
  filtri?: { includeNascosti?: boolean }
): Promise<FullLocaleData | null> {
  const supabase = createClient();
  const includeNascosti = filtri?.includeNascosti ?? false;

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

  // 4. Carica Categorie
  let queryCat = supabase
    .from('categorie_menu')
    .select('*')
    .eq('locale_id', localeId)
    .order('ordine', { ascending: true });

  if (!includeNascosti) {
    queryCat = queryCat.eq('visibile', true);
  }
  const { data: categorie } = await queryCat;

  // 5. Carica Prodotti
  let queryProd = supabase
    .from('prodotti')
    .select('*')
    .eq('locale_id', localeId)
    .order('ordine', { ascending: true });

  if (!includeNascosti) {
    queryProd = queryProd.eq('disponibile', true);
  }
  const { data: prodotti } = await queryProd;

  // 6. Carica Gruppi Opzioni e Opzioni per i prodotti
  const { data: gruppiOpzioni } = await supabase
    .from('gruppi_opzioni')
    .select('*')
    .eq('locale_id', localeId)
    .order('ordine', { ascending: true });

  let queryOpz = supabase
    .from('opzioni')
    .select('*')
    .eq('locale_id', localeId)
    .order('ordine', { ascending: true });

  if (!includeNascosti) {
    queryOpz = queryOpz.eq('disponibile', true);
  }
  const { data: opzioni } = await queryOpz;

  const gruppiConOpzioni = (gruppiOpzioni || []).map((gruppo) => ({
    ...gruppo,
    opzioni: (opzioni || []).filter((o) => o.gruppo_id === gruppo.id),
  }));

  const prodottiConOpzioni: ProdottoConOpzioni[] = (prodotti || []).map((p) => ({
    ...p,
    gruppiOpzioni: gruppiConOpzioni.filter((g) => g.prodotto_id === p.id),
  }));

  const categorieConProdotti: CategoriaConProdotti[] = (categorie || []).map((cat) => ({
    ...cat,
    prodotti: prodottiConOpzioni.filter((p) => p.categoria_id === cat.id),
  }));

  // 7. Carica Menu Fissi e Slot
  let queryMenuFissi = supabase
    .from('menu_fissi')
    .select('*')
    .eq('locale_id', localeId);

  if (!includeNascosti) {
    queryMenuFissi = queryMenuFissi.eq('attivo', true);
  }
  const { data: menuFissi } = await queryMenuFissi;

  const { data: slots } = await supabase
    .from('menu_fissi_slot')
    .select('*')
    .eq('locale_id', localeId)
    .order('ordine', { ascending: true });

  const menuFissiConSlot: MenuFissoConSlot[] = (menuFissi || []).map((mf) => ({
    ...mf,
    slots: (slots || []).filter((s) => s.menu_fisso_id === mf.id),
  }));

  // 8. Carica Piatti del Giorno
  let queryPiatti = supabase
    .from('piatti_del_giorno')
    .select('*')
    .eq('locale_id', localeId);

  if (!includeNascosti) {
    queryPiatti = queryPiatti.eq('attivo', true);
  }
  const { data: piattiDelGiorno } = await queryPiatti;

  // 9. Carica Destinazioni e Fasce
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

  // 10. Zone di consegna
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
    menuFissi: menuFissiConSlot,
    piattiDelGiorno: piattiDelGiorno || [],
    destinazioni: destinazioniConFasce,
    zoneConsegna: zoneConsegna || [],
  };
}
