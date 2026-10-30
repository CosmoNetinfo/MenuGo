import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isOrarioLimiteSuperato } from '@/lib/order-rules';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const localeIdParam = searchParams.get('localeId');

  if (!slug && !localeIdParam) {
    return NextResponse.json(
      { errore: 'Parametro "slug" o "localeId" obbligatorio.' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // 1. Trova il locale
  let queryLocale = supabase.from('locali').select('id, slug, stato');
  if (slug) {
    queryLocale = queryLocale.eq('slug', slug);
  } else if (localeIdParam) {
    queryLocale = queryLocale.eq('id', localeIdParam);
  }

  const { data: locale, error: errLocale } = await queryLocale.single();

  if (errLocale || !locale) {
    return NextResponse.json({ errore: 'Locale non trovato.' }, { status: 404 });
  }

  const localeId = locale.id;

  // 2. Carica impostazioni locale
  const { data: settings } = await supabase
    .from('locale_settings')
    .select('*')
    .eq('locale_id', localeId)
    .single();

  const modalita = settings?.modalita || 'vetrina_ordini';

  // Se è in sola consultazione, restituisci disponibilità bloccata per gli ordini
  if (modalita === 'solo_vetrina' || locale.stato !== 'attivo') {
    return NextResponse.json({
      localeId,
      slug: locale.slug,
      modalita,
      statoLocale: locale.stato,
      ordiniAttivi: false,
      giorniDisponibili: [],
      destinazioni: [],
      zoneConsegna: [],
    });
  }

  // 3. Carica destinazioni e fasce
  const { data: destinazioni } = await supabase
    .from('destinazioni')
    .select('*, fasce_orarie(*)')
    .eq('locale_id', localeId)
    .eq('attiva', true)
    .order('ordine', { ascending: true });

  // 4. Carica zone consegna
  const { data: zoneConsegna } = await supabase
    .from('zone_consegna')
    .select('*')
    .eq('locale_id', localeId)
    .eq('attiva', true)
    .order('ordine', { ascending: true });

  // 5. Carica calendario giorni speciali per i prossimi 14 giorni
  const oggi = new Date();
  const giorniCalcolati: Array<{
    data: string; // "YYYY-MM-DD"
    giornoSettimana: number; // 1 = Lun, 7 = Dom
    aperto: boolean;
    motivo?: string;
  }> = [];

  const settingsRegole = {
    orario_limite_ordini: settings?.orario_limite_ordini || '14:00:00',
    orario_limite_giorni_anticipo: settings?.orario_limite_giorni_anticipo ?? 1,
    lunedi_chiude_sabato: settings?.lunedi_chiude_sabato ?? false,
  };

  // Carica eccezioni calendario
  const dataInizioStr = oggi.toISOString().split('T')[0];
  const { data: calendarioEccezioni } = await supabase
    .from('calendario_giorni')
    .select('*')
    .eq('locale_id', localeId)
    .gte('giorno', dataInizioStr);

  // Calcola i prossimi 14 giorni
  for (let i = 0; i < 14; i++) {
    const d = new Date(oggi.getTime() + i * 24 * 60 * 60 * 1000);
    const dataStr = d.toISOString().split('T')[0];

    // Giorno della settimana (1 = Lun, ..., 7 = Dom)
    const dayOfWeekIndex = d.getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sab
    const giornoSettimana = dayOfWeekIndex === 0 ? 7 : dayOfWeekIndex;

    // Controlla se l'orario limite è già scaduto per questa data
    const scaduto = isOrarioLimiteSuperato(dataStr, settingsRegole, oggi);

    // Controlla eccezioni calendario
    const eccezione = calendarioEccezioni?.find((c) => c.giorno === dataStr && !c.destinazione_id);

    let aperto = !scaduto;
    let motivo: string | undefined = undefined;

    if (eccezione) {
      if (eccezione.stato === 'chiuso') {
        aperto = false;
        motivo = eccezione.motivo_chiusura || 'Chiusura straordinaria programmata';
      } else if (eccezione.stato === 'aperto') {
        // Apertura forzata rispetta comunque la deadline
        if (scaduto) {
          aperto = false;
          motivo = 'Orario limite ordini scaduto';
        } else {
          aperto = true;
        }
      }
    } else if (scaduto) {
      motivo = 'Orario limite ordini superato';
    }

    giorniCalcolati.push({
      data: dataStr,
      giornoSettimana,
      aperto,
      motivo,
    });
  }

  return NextResponse.json({
    localeId,
    slug: locale.slug,
    modalita,
    statoLocale: locale.stato,
    ordiniAttivi: true,
    regole: {
      orarioLimiteOrdini: settingsRegole.orario_limite_ordini,
      orarioLimiteAnnullamento: settings?.orario_limite_annullamento || '09:00:00',
      accettaContanti: settings?.accetta_contanti ?? true,
      accettaStripe: settings?.accetta_stripe ?? false,
    },
    giorniDisponibili: giorniCalcolati,
    destinazioni: (destinazioni || []).map((d) => ({
      id: d.id,
      nome: d.nome,
      indirizzo: d.indirizzo,
      fasce: (d.fasce_orarie || [])
        .filter((f: { attiva: boolean }) => f.attiva)
        .map((f: { id: string; ora_inizio: string; ora_fine: string; giorni_settimana: number[] }) => ({
          id: f.id,
          oraInizio: f.ora_inizio,
          oraFine: f.ora_fine,
          giorniSettimana: f.giorni_settimana,
        })),
    })),
    zoneConsegna: (zoneConsegna || []).map((z) => ({
      id: z.id,
      nome: z.nome,
      costoCentesimi: z.costo,
    })),
  });
}
