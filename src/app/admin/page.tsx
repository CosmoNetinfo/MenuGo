import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BRAND_CONFIG } from '@/config/brand';
import { getFullLocaleBySlug } from '@/lib/queries/locale';
import { formatPrice } from '@/lib/formatters';

export const metadata = {
  title: 'Pannello di Controllo — MenuGo',
};

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  // Recupera il locale dell'utente loggato
  const { data: utente } = await supabase
    .from('utenti_locale')
    .select('locale_id, locali(slug)')
    .eq('user_id', user.id)
    .single();

  const localeRel = utente?.locali as unknown as { slug: string } | null;
  const slug = localeRel?.slug;
  const localeId = utente?.locale_id;

  const data = slug ? await getFullLocaleBySlug(slug) : null;
  const nomeLocale = data?.branding.nome || 'Il tuo locale';

  // Carica statistiche ordini del giorno (oggi Rome)
  const oggiStr = new Date().toISOString().split('T')[0];
  const adminClient = createAdminClient();

  const { data: ordiniOggi } = localeId
    ? await adminClient
        .from('ordini')
        .select('*, righe_ordine(*)')
        .eq('locale_id', localeId)
        .eq('data_consegna', oggiStr)
        .neq('stato', 'annullato')
    : { data: [] };

  const ordiniList = ordiniOggi || [];
  const totaleOrdini = ordiniList.length;

  // Calcolo incassi
  const incassoTotale = ordiniList.reduce((acc, o) => acc + o.totale, 0);
  const incassoPagato = ordiniList
    .filter((o) => o.stato_pagamento === 'pagato')
    .reduce((acc, o) => acc + o.totale, 0);
  const incassoDaRiscuotere = incassoTotale - incassoPagato;

  // Calcolo porzioni da preparare oggi
  const porzioniPerPiatto: Record<string, number> = {};
  for (const ord of ordiniList) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const riga of (ord.righe_ordine || []) as any[]) {
      const nome = riga.nome_snapshot;
      porzioniPerPiatto[nome] = (porzioniPerPiatto[nome] || 0) + riga.quantita;
    }
  }

  const piattiTop = Object.entries(porzioniPerPiatto)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {BRAND_CONFIG.name} · Pannello Gestore
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {nomeLocale}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Riepilogo del giorno: {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {slug && (
            <div className="flex items-center gap-2">
              <Link
                href={`/${slug}`}
                target="_blank"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                🌐 Vetrina Online
              </Link>
              <Link
                href="/admin/cucina"
                target="_blank"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
              >
                👨‍🍳 Vista Cucina
              </Link>
            </div>
          )}
        </header>

        {/* Metriche del giorno */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Ordini di Oggi
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
              {totaleOrdini}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {ordiniList.filter((o) => o.stato === 'in_preparazione').length} in preparazione
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Incasso Previsto
            </span>
            <span className="text-3xl font-extrabold text-emerald-700 mt-2 block">
              {formatPrice(incassoTotale)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Totale fatturato atteso</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Già Incassato
            </span>
            <span className="text-3xl font-extrabold text-sky-600 mt-2 block">
              {formatPrice(incassoPagato)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Pagamenti saldati</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Da Riscuotere
            </span>
            <span className="text-3xl font-extrabold text-amber-600 mt-2 block">
              {formatPrice(incassoDaRiscuotere)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">In contanti alla consegna</span>
          </div>
        </div>

        {/* Porzioni da preparare oggi */}
        {piattiTop.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                🍲 Cosa preparare oggi (totale porzioni)
              </h2>
              <Link href="/admin/cucina" className="text-xs font-semibold text-emerald-700 hover:underline">
                Stampa per la cucina →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {piattiTop.map(([nome, qta]) => (
                <div key={nome} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-2xl font-black text-slate-900 block">{qta}x</span>
                  <span className="text-xs font-semibold text-slate-700 truncate block mt-0.5">{nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Griglia Moduli di Gestione */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link
            href="/admin/ordini"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-xs group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              📋
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
              Ordini Ricevuti
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Lista ordini, filtri per data/stato, segna contanti ricevuti e annulla.
            </p>
          </Link>

          <Link
            href="/admin/cucina"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-xs group"
          >
            <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              👨‍🍳
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition">
              Vista Cucina
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Foglio di lavoro stampabile ad alto contrasto con porzioni e orari.
            </p>
          </Link>

          <Link
            href="/admin/menu"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-xs group"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              🍽️
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition">
              Menu &amp; Piatti
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Categorie, varianti, menu fissi, piatti del giorno e allergeni UE.
            </p>
          </Link>

          <Link
            href="/admin/aspetto"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-xs group"
          >
            <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              🎨
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition">
              Vetrina e Aspetto
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Nome, logo con rimozione sfondo, colori, copertina e verifica contrasto.
            </p>
          </Link>

          <Link
            href="/admin/servizio"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-xs group"
          >
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              🛵
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition">
              Servizio &amp; Zone
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Modalità solo vetrina/ordini, destinazioni convenzionate, zone domicilio.
            </p>
          </Link>

          <Link
            href="/admin/calendario"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-xs group"
          >
            <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              📅
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-rose-700 transition">
              Calendario Giorni
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Aperture e chiusure straordinarie con avviso sugli ordini già effettuati.
            </p>
          </Link>

          <Link
            href="/admin/impostazioni"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-xs group"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              ⚙️
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-slate-800 transition">
              Regole &amp; Impostazioni
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Orari limite ordini e annullamento, pagamenti, contatti e dati legali.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
