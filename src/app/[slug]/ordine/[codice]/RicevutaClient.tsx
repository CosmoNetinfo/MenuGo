'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { annullaOrdineAction } from '@/lib/actions/orders';

interface RicevutaClientProps {
  ordineId: string;
  codiceOrdine: string;
  statoAttuale: string;
  dataConsegna: string;
  orarioLimiteAnnullamento?: string;
}

export default function RicevutaClient({
  ordineId,
  codiceOrdine,
  statoAttuale,
  dataConsegna,
  orarioLimiteAnnullamento = '09:00',
}: RicevutaClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [mostraPromptAnnulla, setMostraPromptAnnulla] = useState(false);
  const [telefonoConferma, setTelefonoConferma] = useState('');

  const isAnnullato = statoAttuale === 'annullato';
  const isCompletato = statoAttuale === 'completato' || statoAttuale === 'in_preparazione';

  async function handleAnnulla() {
    setLoading(true);
    setErrore(null);
    try {
      const res = await annullaOrdineAction(ordineId, telefonoConferma);
      if (!res.success) {
        setErrore(res.errore || 'Impossibile annullare l’ordine.');
        setLoading(false);
        return;
      }
      setMostraPromptAnnulla(false);
      router.refresh();
    } catch (err: unknown) {
      setErrore(err instanceof Error ? err.message : 'Errore durante l’annullamento.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Badge Stato */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div>
          <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">
            Stato Ordine
          </span>
          <span
            className={`text-base font-extrabold capitalize ${
              isAnnullato
                ? 'text-red-600'
                : statoAttuale === 'confermato'
                ? 'text-emerald-700'
                : 'text-amber-600'
            }`}
          >
            {statoAttuale.replace('_', ' ')}
          </span>
        </div>

        {/* Pulsante Annulla se non ancora completato o già annullato */}
        {!isAnnullato && !isCompletato && !mostraPromptAnnulla && (
          <button
            onClick={() => setMostraPromptAnnulla(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition"
          >
            Annulla Ordine
          </button>
        )}
      </div>

      {/* Modal / Dialogo conferma annullamento */}
      {mostraPromptAnnulla && (
        <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-3">
          <p className="text-xs font-bold text-red-800">
            Confermi di voler annullare l’ordine {codiceOrdine}?
          </p>
          <p className="text-[11px] text-red-600">
            L’annullamento è consentito fino alle ore {orarioLimiteAnnullamento.slice(0, 5)} del giorno di consegna ({dataConsegna}).
            Inserisci il numero di telefono per confermare:
          </p>
          <input
            type="tel"
            value={telefonoConferma}
            onChange={(e) => setTelefonoConferma(e.target.value)}
            placeholder="Il tuo numero di cellulare"
            className="w-full px-3 py-2 rounded-xl border border-red-300 text-xs bg-white text-slate-800"
          />

          {errore && <p className="text-xs text-red-700 font-medium">{errore}</p>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setMostraPromptAnnulla(false);
                setErrore(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200"
            >
              Indietro
            </button>
            <button
              onClick={handleAnnulla}
              disabled={loading || !telefonoConferma}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
            >
              {loading ? 'Annullamento…' : 'Conferma Annullamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
