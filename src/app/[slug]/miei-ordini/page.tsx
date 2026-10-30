'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OrdineLocale {
  codice: string;
  data: string;
}

export default function MieiOrdiniPage({ params }: { params: { slug: string } }) {
  const [ordini, setOrdini] = useState<OrdineLocale[]>([]);
  const [caricato, setCaricato] = useState(false);

  useEffect(() => {
    try {
      const storageKey = `menugo_ordini_${params.slug}`;
      const salvati = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setOrdini(salvati);
    } catch {
      // Ignora errori localStorage
    } finally {
      setCaricato(true);
    }
  }, [params.slug]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
        <div>
          <Link
            href={`/${params.slug}`}
            className="text-xs font-semibold text-emerald-700 hover:underline mb-2 block"
          >
            ← Torna al menu
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">I Miei Ordini</h1>
          <p className="text-xs text-slate-500">
            Rivedi le ricevute degli ordini effettuati da questo dispositivo.
          </p>
        </div>

        {!caricato ? (
          <div className="text-center py-8 text-xs text-slate-400">Caricamento ordini…</div>
        ) : ordini.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-3xl block mb-2">📋</span>
            <p className="text-sm font-semibold text-slate-800">Nessun ordine registrato</p>
            <p className="text-xs text-slate-400 mt-1">Non hai ancora effettuato ordini da questo dispositivo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ordini.map((ord, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-sm text-slate-900 block">{ord.codice}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(ord.data).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <Link
                  href={`/${params.slug}/ordine/${ord.codice}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                >
                  Vedi Ricevuta →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
