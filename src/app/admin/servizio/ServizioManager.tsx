'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/formatters';
import {
  salvaImpostazioniLocaleAction,
  creaZonaConsegnaAction,
  toggleZonaConsegnaAction,
  eliminaZonaConsegnaAction,
  creaDestinazioneAction,
  toggleDestinazioneAction,
} from '@/lib/actions/admin-orders';

interface ServizioManagerProps {
  localeId: string;
  modalitaAttuale: 'solo_vetrina' | 'vetrina_ordini';
  initialZone: Array<{ id: string; nome: string; costo: number; attiva: boolean }>;
  initialDestinazioni: Array<{ id: string; nome: string; indirizzo: string | null; attiva: boolean }>;
}

export default function ServizioManager({
  localeId,
  modalitaAttuale,
  initialZone,
  initialDestinazioni,
}: ServizioManagerProps) {
  const [modalita, setModalita] = useState(modalitaAttuale);
  const [nuovaZonaNome, setNuovaZonaNome] = useState('');
  const [nuovaZonaCostoEuro, setNuovaZonaCostoEuro] = useState('2.50');

  const [nuovaDestNome, setNuovaDestNome] = useState('');
  const [nuovaDestIndirizzo, setNuovaDestIndirizzo] = useState('');

  const [isPending, startTransition] = useTransition();
  const [messaggio, setMessaggio] = useState<string | null>(null);

  function handleToggleModalita(nuovaMod: 'solo_vetrina' | 'vetrina_ordini') {
    setModalita(nuovaMod);
    startTransition(async () => {
      const res = await salvaImpostazioniLocaleAction(localeId, { modalita: nuovaMod });
      if (res.success) {
        setMessaggio(`Modalità aggiornata a: ${nuovaMod === 'solo_vetrina' ? 'Solo Consultazione' : 'Ordini Attivi'}`);
        setTimeout(() => setMessaggio(null), 4000);
      }
    });
  }

  function handleCreaZona(e: React.FormEvent) {
    e.preventDefault();
    if (!nuovaZonaNome.trim()) return;
    const costoCentesimi = Math.round(parseFloat(nuovaZonaCostoEuro.replace(',', '.')) * 100);

    startTransition(async () => {
      await creaZonaConsegnaAction(localeId, nuovaZonaNome, costoCentesimi);
      setNuovaZonaNome('');
      setMessaggio('Zona di consegna aggiunta.');
      setTimeout(() => setMessaggio(null), 4000);
    });
  }

  function handleCreaDestinazione(e: React.FormEvent) {
    e.preventDefault();
    if (!nuovaDestNome.trim()) return;

    startTransition(async () => {
      await creaDestinazioneAction(localeId, nuovaDestNome, nuovaDestIndirizzo);
      setNuovaDestNome('');
      setNuovaDestIndirizzo('');
      setMessaggio('Punto di consegna programmata aggiunto.');
      setTimeout(() => setMessaggio(null), 4000);
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
            <span>Servizio & Zone</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Configurazione Servizio</h1>
        </div>
      </div>

      {messaggio && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          {messaggio}
        </div>
      )}

      {/* 1. Switch Modalità Vetrina / Ordini */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Modalità della Vetrina Online</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Decidi se consentire ai clienti di effettuare ordini o solo consultare il menu.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={() => handleToggleModalita('vetrina_ordini')}
            disabled={isPending}
            className={`p-4 rounded-2xl border-2 text-left transition ${
              modalita === 'vetrina_ordini'
                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <span className="text-xl block mb-1">🛒</span>
            <span className="font-bold text-sm block">Vetrina + Ordini Online</span>
            <span className="text-xs text-slate-500 mt-1 block">
              I clienti possono comporre il carrello e inviare ordini per consegna o ritiro.
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleModalita('solo_vetrina')}
            disabled={isPending}
            className={`p-4 rounded-2xl border-2 text-left transition ${
              modalita === 'solo_vetrina'
                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-xs'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <span className="text-xl block mb-1">📖</span>
            <span className="font-bold text-sm block">Solo Vetrina (Consultazione)</span>
            <span className="text-xs text-slate-500 mt-1 block">
              I clienti vedono foto, descrizioni e prezzi ma il carrello è disattivato.
            </span>
          </button>
        </div>
      </div>

      {/* 2. Zone di consegna a domicilio */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Zone di Consegna a Domicilio</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura le aree coperte e il relativo supplemento di consegna.
          </p>
        </div>

        {/* Form Nuova Zona */}
        <form onSubmit={handleCreaZona} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Zona</label>
            <input
              type="text"
              placeholder="es. Centro Storico, Quartiere Nord"
              value={nuovaZonaNome}
              onChange={(e) => setNuovaZonaNome(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div className="w-full sm:w-36">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Costo (€)</label>
            <input
              type="number"
              step="0.50"
              min="0"
              value={nuovaZonaCostoEuro}
              onChange={(e) => setNuovaZonaCostoEuro(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            + Aggiungi Zona
          </button>
        </form>

        {/* Lista Zone */}
        <div className="divide-y divide-slate-100">
          {initialZone.map((z) => (
            <div key={z.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900">{z.nome}</span>
                <span className="text-xs text-emerald-700 font-semibold ml-2">
                  {z.costo === 0 ? 'Gratis' : formatPrice(z.costo)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleZonaConsegnaAction(localeId, z.id, z.attiva)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    z.attiva ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {z.attiva ? 'Attiva' : 'Disattivata'}
                </button>
                <button
                  onClick={() => eliminaZonaConsegnaAction(localeId, z.id)}
                  className="text-xs text-red-600 hover:underline px-1"
                >
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Destinazioni Programmate */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Punti di Consegna Programmata (Aziende/Uffici)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Luoghi convenzionati dove effettuare consegne collettive a orari prestabiliti.
          </p>
        </div>

        {/* Form Nuova Destinazione */}
        <form onSubmit={handleCreaDestinazione} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Sede / Azienda</label>
            <input
              type="text"
              placeholder="es. Sede Aziendale TechHub, Mensa Polo B"
              value={nuovaDestNome}
              onChange={(e) => setNuovaDestNome(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Indirizzo (opzionale)</label>
            <input
              type="text"
              placeholder="Via Roma 100, Piano Terra"
              value={nuovaDestIndirizzo}
              onChange={(e) => setNuovaDestIndirizzo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            + Aggiungi Sede
          </button>
        </form>

        {/* Lista Destinazioni */}
        <div className="divide-y divide-slate-100">
          {initialDestinazioni.map((d) => (
            <div key={d.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900">{d.nome}</span>
                {d.indirizzo && <span className="text-xs text-slate-400 ml-2">({d.indirizzo})</span>}
              </div>
              <button
                onClick={() => toggleDestinazioneAction(localeId, d.id, d.attiva)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  d.attiva ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {d.attiva ? 'Attiva' : 'Disattivata'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
