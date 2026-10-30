'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { salvaCalendarioGiornoAction } from '@/lib/actions/admin-orders';

interface CalendarioManagerProps {
  localeId: string;
  initialEccezioni: Array<{
    id: string;
    giorno: string;
    stato: 'automatico' | 'aperto' | 'chiuso';
    motivo_chiusura: string | null;
  }>;
}

export default function CalendarioManager({ localeId, initialEccezioni }: CalendarioManagerProps) {
  const [dataSelezionata, setDataSelezionata] = useState('');
  const [statoSelezionato, setStatoSelezionato] = useState<'automatico' | 'aperto' | 'chiuso'>('chiuso');
  const [motivo, setMotivo] = useState('');
  const [isPending, startTransition] = useTransition();
  const [notifica, setNotifica] = useState<string | null>(null);

  // Genera i prossimi 21 giorni
  const oggi = new Date();
  const giorniElenco: string[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(oggi.getTime() + i * 24 * 60 * 60 * 1000);
    giorniElenco.push(d.toISOString().split('T')[0]);
  }

  function handleSalva(e: React.FormEvent) {
    e.preventDefault();
    if (!dataSelezionata) return;

    startTransition(async () => {
      const res = await salvaCalendarioGiornoAction(
        localeId,
        dataSelezionata,
        statoSelezionato,
        motivo
      );

      if (res.success) {
        if (statoSelezionato === 'chiuso' && res.ordiniEsistenti > 0) {
          setNotifica(`⚠️ Attenzione: hai impostato Chiuso per il giorno ${dataSelezionata}, ma ci sono ${res.ordiniEsistenti} ordini già effettuati per quella data!`);
        } else {
          setNotifica(`Calendario aggiornato per il giorno ${dataSelezionata}.`);
        }
        setDataSelezionata('');
        setMotivo('');
        setTimeout(() => setNotifica(null), 6000);
      }
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
            <span>Calendario</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Aperture &amp; Chiusure Straordinarie</h1>
        </div>
      </div>

      {notifica && (
        <div className="p-4 rounded-xl text-xs font-bold bg-amber-50 border border-amber-200 text-amber-900">
          {notifica}
        </div>
      )}

      {/* Form Imposta Giorno */}
      <form
        onSubmit={handleSalva}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900">Modifica Stato di una Data</h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Giorno *</label>
            <input
              type="date"
              value={dataSelezionata}
              onChange={(e) => setDataSelezionata(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Stato *</label>
            <select
              value={statoSelezionato}
              onChange={(e) => setStatoSelezionato(e.target.value as 'automatico' | 'aperto' | 'chiuso')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            >
              <option value="chiuso">🔴 Chiuso (Forzato)</option>
              <option value="aperto">🟢 Aperto (Forzato)</option>
              <option value="automatico">⚪ Automatico (Ripristina standard)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo Chiusura (opzionale)</label>
            <input
              type="text"
              placeholder="es. Ferie aziendali, Manutenzione"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
        >
          {isPending ? 'Salvataggio…' : 'Aggiorna Data'}
        </button>
      </form>

      {/* Prossimi 21 Giorni Calendario */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Panoramica Prossimi 21 Giorni</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {giorniElenco.map((giornoStr) => {
            const ecc = initialEccezioni.find((e) => e.giorno === giornoStr);
            const dataObj = new Date(giornoStr);
            const giornoNome = dataObj.toLocaleDateString('it-IT', { weekday: 'short' });
            const giornoNum = dataObj.getDate();

            const isChiuso = ecc?.stato === 'chiuso';
            const isApertoForzato = ecc?.stato === 'aperto';

            return (
              <div
                key={giornoStr}
                onClick={() => {
                  setDataSelezionata(giornoStr);
                  setStatoSelezionato(ecc ? ecc.stato : 'chiuso');
                  setMotivo(ecc?.motivo_chiusura || '');
                }}
                className={`p-3 rounded-xl border text-center cursor-pointer transition hover:scale-102 ${
                  isChiuso
                    ? 'border-red-300 bg-red-50/70 text-red-900'
                    : isApertoForzato
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{giornoNome}</span>
                <span className="text-lg font-black block mt-0.5">{giornoNum}</span>
                <span className="text-[10px] font-semibold mt-1 block">
                  {isChiuso ? '🔴 Chiuso' : isApertoForzato ? '🟢 Aperto' : '⚪ Normale'}
                </span>
                {ecc?.motivo_chiusura && (
                  <span className="text-[9px] text-red-700 truncate block mt-0.5" title={ecc.motivo_chiusura}>
                    {ecc.motivo_chiusura}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
