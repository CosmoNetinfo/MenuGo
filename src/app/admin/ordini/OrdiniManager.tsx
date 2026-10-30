'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/formatters';
import { aggiornaStatoOrdineAction, aggiornaStatoPagamentoAction } from '@/lib/actions/admin-orders';

export interface OrdineAdminItem {
  id: string;
  codice_ordine: string;
  tipo_servizio: string;
  stato: 'in_attesa' | 'confermato' | 'in_preparazione' | 'completato' | 'annullato';
  stato_pagamento: 'in_attesa' | 'pagato' | 'non_pagato' | 'rimborsato';
  metodo_pagamento: string;
  data_consegna: string;
  fascia_oraria: string;
  nome_cliente: string;
  cognome_cliente: string;
  telefono_cliente: string;
  indirizzo_consegna?: string | null;
  destinazione_snapshot?: { nome?: string } | null;
  note_cliente?: string | null;
  totale: number;
  costo_consegna: number;
  created_at: string;
  righe_ordine?: Array<{
    id: string;
    nome_snapshot: string;
    quantita: number;
    totale_riga: number;
  }>;
}

interface OrdiniManagerProps {
  localeId: string;
  initialOrdini: OrdineAdminItem[];
}

export default function OrdiniManager({ localeId, initialOrdini }: OrdiniManagerProps) {
  const [filtroStato, setFiltroStato] = useState<string>('tutti');
  const [ricerca, setRicerca] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const ordiniFiltrati = initialOrdini.filter((ord) => {
    if (filtroStato !== 'tutti' && ord.stato !== filtroStato) return false;
    if (ricerca.trim()) {
      const q = ricerca.toLowerCase();
      const matchCodice = ord.codice_ordine.toLowerCase().includes(q);
      const matchCliente = `${ord.nome_cliente} ${ord.cognome_cliente}`.toLowerCase().includes(q);
      const matchTel = ord.telefono_cliente.includes(q);
      if (!matchCodice && !matchCliente && !matchTel) return false;
    }
    return true;
  });

  function handleStatoOrdine(id: string, stato: 'in_attesa' | 'confermato' | 'in_preparazione' | 'completato' | 'annullato') {
    startTransition(async () => {
      await aggiornaStatoOrdineAction(localeId, id, stato);
    });
  }

  function handleStatoPagamento(id: string, pag: 'in_attesa' | 'pagato' | 'non_pagato' | 'rimborsato') {
    startTransition(async () => {
      await aggiornaStatoPagamentoAction(localeId, id, pag);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <Link href="/admin" className="hover:underline">
              ← Dashboard
            </Link>
            <span>/</span>
            <span>Ordini Ricevuti</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Gestione Ordini</h1>
        </div>

        <Link
          href="/admin/cucina"
          target="_blank"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition self-start sm:self-auto"
        >
          👨‍🍳 Vista Cucina / Stampa
        </Link>
      </div>

      {/* Barra Filtri e Ricerca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
          {['tutti', 'in_attesa', 'confermato', 'in_preparazione', 'completato', 'annullato'].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroStato(st)}
              className={`px-3 py-1.5 rounded-xl capitalize transition whitespace-nowrap ${
                filtroStato === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Cerca per codice, cliente, tel…"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
        />
      </div>

      {/* Lista Ordini */}
      {ordiniFiltrati.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          <span className="text-4xl block mb-2">📋</span>
          <p className="text-sm font-semibold text-slate-700">Nessun ordine trovato</p>
          <p className="text-xs">Nessun ordine corrisponde ai criteri di filtro selezionati.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ordiniFiltrati.map((ord) => (
            <div
              key={ord.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition space-y-4 ${
                ord.stato === 'annullato' ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
              }`}
            >
              {/* Header card ordine */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                    {ord.codice_ordine}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 text-sm">
                      {ord.nome_cliente} {ord.cognome_cliente}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">📞 {ord.telefono_cliente}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                      ord.stato === 'completato'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ord.stato === 'annullato'
                        ? 'bg-red-100 text-red-800'
                        : ord.stato === 'in_preparazione'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ord.stato.replace('_', ' ')}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      ord.stato_pagamento === 'pagato'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ord.stato_pagamento === 'pagato' ? 'Pagato' : 'Da Saldare'}
                  </span>
                </div>
              </div>

              {/* Dati Consegna */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase">Giorno</span>
                  <span className="font-bold text-slate-800">{ord.data_consegna}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase">Fascia Oraria</span>
                  <span className="font-bold text-slate-800">{ord.fascia_oraria}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase">Servizio</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {ord.tipo_servizio === 'domicilio' && `🛵 Domicilio: ${ord.indirizzo_consegna || ''}`}
                    {ord.tipo_servizio === 'ritiro' && '🏃 Ritiro'}
                    {ord.tipo_servizio === 'destinazione_programmata' && `🏢 ${ord.destinazione_snapshot?.nome || 'Punto Fisso'}`}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block text-[10px] uppercase">Totale</span>
                  <span className="text-sm font-extrabold text-emerald-700">{formatPrice(ord.totale)}</span>
                </div>
              </div>

              {/* Note */}
              {ord.note_cliente && (
                <p className="text-xs text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                  Nota cliente: “{ord.note_cliente}”
                </p>
              )}

              {/* Piatti Ordinati */}
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Portate</span>
                <div className="flex flex-wrap gap-2">
                  {ord.righe_ordine?.map((r) => (
                    <span key={r.id} className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-medium">
                      {r.quantita}x {r.nome_snapshot}
                    </span>
                  ))}
                </div>
              </div>

              {/* Barra Azioni Rapide */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {/* Azioni Pagamento */}
                <div className="flex items-center gap-1.5">
                  {ord.stato_pagamento !== 'pagato' && (
                    <button
                      onClick={() => handleStatoPagamento(ord.id, 'pagato')}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition"
                    >
                      💵 Contanti Ricevuti
                    </button>
                  )}
                  {ord.stato_pagamento === 'pagato' && (
                    <button
                      onClick={() => handleStatoPagamento(ord.id, 'non_pagato')}
                      disabled={isPending}
                      className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-600 text-[11px]"
                    >
                      Segna non pagato
                    </button>
                  )}
                </div>

                {/* Azioni Avanzamento Stato */}
                <div className="flex items-center gap-1.5">
                  {ord.stato === 'in_attesa' && (
                    <button
                      onClick={() => handleStatoOrdine(ord.id, 'confermato')}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                    >
                      Conferma
                    </button>
                  )}
                  {ord.stato === 'confermato' && (
                    <button
                      onClick={() => handleStatoOrdine(ord.id, 'in_preparazione')}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700"
                    >
                      Metti in Preparazione
                    </button>
                  )}
                  {ord.stato === 'in_preparazione' && (
                    <button
                      onClick={() => handleStatoOrdine(ord.id, 'completato')}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                    >
                      Segna Completato
                    </button>
                  )}
                  {ord.stato !== 'annullato' && ord.stato !== 'completato' && (
                    <button
                      onClick={() => handleStatoOrdine(ord.id, 'annullato')}
                      disabled={isPending}
                      className="px-2.5 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                    >
                      Annulla
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
