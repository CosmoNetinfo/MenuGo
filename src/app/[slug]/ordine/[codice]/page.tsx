import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrdineByCodice } from '@/lib/actions/orders';
import { formatPrice } from '@/lib/formatters';
import RicevutaClient from './RicevutaClient';
import type { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
    codice: string;
  };
}

export const metadata: Metadata = {
  title: 'Ricevuta Ordine — MenuGo',
};

export default async function OrdineRicevutaPage({ params }: PageProps) {
  const ordine = await getOrdineByCodice(params.slug, params.codice);

  if (!ordine) {
    notFound();
  }

  const branding = (ordine as unknown as { locale_branding?: { nome?: string; colore_primario?: string } }).locale_branding;
  const settings = (ordine as unknown as { locale_settings?: { telefono?: string; indirizzo?: string; testo_ricevuta?: string; orario_limite_annullamento?: string } }).locale_settings;
  const righe = (ordine as unknown as { righe_ordine?: Array<{ id: string; nome_snapshot: string; quantita: number; totale_riga: number; opzioni_scelte_snapshot?: unknown }> }).righe_ordine || [];

  const nomeLocale = branding?.nome || 'Ristorante';

  const dataConsegnaFormattata = new Date(ordine.data_consegna).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Intestazione Ricevuta */}
        <div className="p-6 sm:p-8 border-b border-slate-100 text-center space-y-2 bg-gradient-to-b from-slate-50 to-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-1">
            ✓ Ordine Ricevuto
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {ordine.codice_ordine}
          </h1>
          <p className="text-sm font-semibold text-slate-700">{nomeLocale}</p>
          <p className="text-xs text-slate-400">
            Effettuato il {new Date(ordine.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Dettagli consegna e stato interattivo */}
        <div className="p-6 sm:p-8 space-y-6">
          <RicevutaClient
            ordineId={ordine.id}
            codiceOrdine={ordine.codice_ordine}
            statoAttuale={ordine.stato}
            dataConsegna={ordine.data_consegna}
            orarioLimiteAnnullamento={settings?.orario_limite_annullamento}
          />

          {/* Dati Consegna */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Data Consegna/Ritiro
              </span>
              <p className="font-bold text-slate-900 capitalize">{dataConsegnaFormattata}</p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Fascia Oraria
              </span>
              <p className="font-bold text-slate-900">{ordine.fascia_oraria}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Destinazione / Servizio
              </span>
              <p className="font-semibold text-slate-800">
                {ordine.tipo_servizio === 'domicilio' && `🛵 Domicilio: ${ordine.indirizzo_consegna || 'Indirizzo specificato'}`}
                {ordine.tipo_servizio === 'ritiro' && '🏃 Ritiro presso il locale'}
                {ordine.tipo_servizio === 'destinazione_programmata' &&
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  `🏢 Punto convenzionato: ${(ordine.destinazione_snapshot as any)?.nome || 'Punto fisso'}`}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Intestatario
              </span>
              <p className="font-semibold text-slate-800">
                {ordine.nome_cliente} {ordine.cognome_cliente}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Telefono
              </span>
              <p className="font-semibold text-slate-800">{ordine.telefono_cliente}</p>
            </div>
            {ordine.note_cliente && (
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Note
                </span>
                <p className="text-slate-600 italic">“{ordine.note_cliente}”</p>
              </div>
            )}
          </div>

          {/* Tabella Piatti */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Dettaglio Piatti
            </h3>
            <div className="divide-y divide-slate-100 border-y border-slate-100 text-xs">
              {righe.map((riga) => (
                <div key={riga.id} className="py-2.5 flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-800">
                      {riga.quantita}x {riga.nome_snapshot}
                    </span>
                    {/* Varianti scelte */}
                    {Array.isArray(riga.opzioni_scelte_snapshot) && (
                      <div className="text-[11px] text-slate-500 pl-2">
                        {riga.opzioni_scelte_snapshot.map((op: { nome?: string; nomeSlot?: string; nomeProdotto?: string }, idx: number) => (
                          <span key={idx} className="block">
                            {op.nomeSlot ? `${op.nomeSlot}: ${op.nomeProdotto}` : op.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-slate-900">{formatPrice(riga.totale_riga)}</span>
                </div>
              ))}
            </div>

            {/* Totali */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-2">
              {ordine.costo_consegna > 0 && (
                <div className="flex justify-between">
                  <span>Costo consegna</span>
                  <span>+{formatPrice(ordine.costo_consegna)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Totale Da Saldare</span>
                <span className="text-emerald-700">{formatPrice(ordine.totale)}</span>
              </div>
              <p className="text-[11px] text-slate-400 text-right">
                Metodo: {ordine.metodo_pagamento === 'contanti' ? 'Contanti alla consegna/ritiro' : 'Carta'}
              </p>
            </div>
          </div>

          {/* Testo ricevuta personalizzato del gestore */}
          {settings?.testo_ricevuta && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <p className="font-semibold mb-1">Messaggio dal ristorante:</p>
              <p>{settings.testo_ricevuta}</p>
            </div>
          )}

          {/* Dicitura non fiscale obbligatoria (Brief Sez. 6) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-400 text-center">
            ⚠️ Questo riepilogo in app ha valore puramente informativo e non costituisce documento fiscale.
          </div>

          {/* Navigazione */}
          <div className="flex justify-between items-center pt-2">
            <Link
              href={`/${params.slug}`}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              ← Torna al menu
            </Link>
            <Link
              href={`/${params.slug}/miei-ordini`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              I miei ordini →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
