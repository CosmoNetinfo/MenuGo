'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formattaPrezzo } from '@/lib/formatters';
import {
  creaNuovoLocaleAction,
  cambiaStatoLocaleAction,
  cambiaPianoLocaleAction,
  type CreaLocaleInput,
} from '@/lib/actions/super-admin';

export interface SuperLocaleItem {
  id: string;
  slug: string;
  stato: 'attivo' | 'sospeso';
  piano: string;
  created_at: string;
  branding?: { nome: string } | null;
  ordiniCount: number;
  fatturatoTotale: number;
  gestori: string[];
}

interface SuperDashboardClientProps {
  initialLocali: SuperLocaleItem[];
}

export default function SuperDashboardClient({ initialLocali }: SuperDashboardClientProps) {
  const [locali, setLocali] = useState<SuperLocaleItem[]>(initialLocali);
  const [isPending, startTransition] = useTransition();
  const [mostraModalCrea, setMostraModalCrea] = useState(false);
  const [nuoveCredenziali, setNuoveCredenziali] = useState<{ email: string; password: string; slug: string } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  // Form Crea Locale
  const [formCrea, setFormCrea] = useState<CreaLocaleInput>({
    nome: '',
    slug: '',
    emailGestore: '',
    piano: 'base',
    creaMenuEsempio: true,
  });

  // Genera slug automaticamente digitando il nome
  function handleNomeChange(val: string) {
    const slugGen = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormCrea((prev) => ({
      ...prev,
      nome: val,
      slug: prev.slug === '' || prev.slug === slugGen.slice(0, -1) ? slugGen : prev.slug,
    }));
  }

  function handleCreaLocale(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    startTransition(async () => {
      const res = await creaNuovoLocaleAction(formCrea);
      if (res.success && res.credenziali) {
        setNuoveCredenziali({
          email: res.credenziali.email,
          password: res.credenziali.password,
          slug: res.slug || formCrea.slug,
        });

        // Aggiungi ottimisticamente il locale alla lista
        setLocali((prev) => [
          {
            id: res.localeId || '',
            slug: res.slug || formCrea.slug,
            stato: 'attivo',
            piano: formCrea.piano,
            created_at: new Date().toISOString(),
            branding: { nome: formCrea.nome },
            ordiniCount: 0,
            fatturatoTotale: 0,
            gestori: [formCrea.emailGestore],
          },
          ...prev,
        ]);

        setFormCrea({
          nome: '',
          slug: '',
          emailGestore: '',
          piano: 'base',
          creaMenuEsempio: true,
        });
        setMostraModalCrea(false);
      } else {
        setErrore(res.errore || 'Errore nella creazione del locale');
      }
    });
  }

  function handleToggleStato(locale: SuperLocaleItem) {
    const nuovoStato = locale.stato === 'attivo' ? 'sospeso' : 'attivo';
    if (!confirm(`Sei sicuro di voler impostare lo stato di "${locale.branding?.nome || locale.slug}" a ${nuovoStato.toUpperCase()}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await cambiaStatoLocaleAction(locale.id, nuovoStato);
      if (res.success) {
        setLocali((prev) =>
          prev.map((l) => (l.id === locale.id ? { ...l, stato: nuovoStato } : l))
        );
      }
    });
  }

  function handleCambiaPiano(localeId: string, nuovoPiano: string) {
    startTransition(async () => {
      const res = await cambiaPianoLocaleAction(localeId, nuovoPiano);
      if (res.success) {
        setLocali((prev) =>
          prev.map((l) => (l.id === localeId ? { ...l, piano: nuovoPiano } : l))
        );
      }
    });
  }

  const totaleOrdini = locali.reduce((acc, l) => acc + l.ordiniCount, 0);
  const fatturatoGlobale = locali.reduce((acc, l) => acc + l.fatturatoTotale, 0);

  return (
    <div className="space-y-8">
      {/* Credenziali generate Banner */}
      {nuoveCredenziali && (
        <div className="p-6 rounded-2xl bg-emerald-950 border-2 border-emerald-500 shadow-xl text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              🎉 Nuovo Locale Creato con Successo!
            </span>
            <button
              onClick={() => setNuoveCredenziali(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Chiudi
            </button>
          </div>
          <p className="text-sm text-slate-200">
            Comunica queste credenziali temporanee al gestore del locale. Per motivi di sicurezza la password non verrà più mostrata.
          </p>
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs space-y-1 select-all border border-slate-700">
            <p><span className="text-slate-400">Vetrina:</span> <span className="text-sky-300">/{nuoveCredenziali.slug}</span></p>
            <p><span className="text-slate-400">Pannello Gestore:</span> <span className="text-sky-300">/admin/login</span></p>
            <p><span className="text-slate-400">Email:</span> <span className="text-emerald-300 font-bold">{nuoveCredenziali.email}</span></p>
            <p><span className="text-slate-400">Password:</span> <span className="text-amber-300 font-bold">{nuoveCredenziali.password}</span></p>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Locali Registrati</span>
          <p className="text-3xl font-black text-white mt-2">{locali.length}</p>
          <p className="text-xs text-slate-400 mt-1">
            {locali.filter((l) => l.stato === 'attivo').length} attivi, {locali.filter((l) => l.stato === 'sospeso').length} sospesi
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Totale Ordini</span>
          <p className="text-3xl font-black text-sky-400 mt-2">{totaleOrdini}</p>
          <p className="text-xs text-slate-400 mt-1">transazioni registrate</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fatturato Globale</span>
          <p className="text-3xl font-black text-emerald-400 mt-2">{formattaPrezzo(fatturatoGlobale)}</p>
          <p className="text-xs text-slate-400 mt-1">valore merce transato</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nuovo Locale</span>
          <button
            onClick={() => setMostraModalCrea(true)}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-xs text-center"
          >
            + Crea Locale
          </button>
        </div>
      </div>

      {/* Modal / Form Creazione Nuovo Locale */}
      {mostraModalCrea && (
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">Crea Nuovo Locale &amp; Invita Gestore</h2>
            <button
              onClick={() => setMostraModalCrea(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Annulla
            </button>
          </div>

          {errore && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs">
              {errore}
            </div>
          )}

          <form onSubmit={handleCreaLocale} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Locale / Insegna *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Pizzeria Bella Napoli"
                  value={formCrea.nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Slug URL (univoco) *</label>
                <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 px-3">
                  <span className="text-xs text-slate-500">/</span>
                  <input
                    type="text"
                    required
                    placeholder="pizzeria-bella-napoli"
                    value={formCrea.slug}
                    onChange={(e) => setFormCrea({ ...formCrea, slug: e.target.value })}
                    className="w-full py-2 bg-transparent text-white text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Gestore *</label>
                <input
                  type="email"
                  required
                  placeholder="gestore@ristorante.it"
                  value={formCrea.emailGestore}
                  onChange={(e) => setFormCrea({ ...formCrea, emailGestore: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Piano Abbonamento</label>
                <select
                  value={formCrea.piano}
                  onChange={(e) => setFormCrea({ ...formCrea, piano: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value="base">Base</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={formCrea.creaMenuEsempio}
                onChange={(e) => setFormCrea({ ...formCrea, creaMenuEsempio: e.target.checked })}
                className="w-4 h-4 rounded-sm text-emerald-500 bg-slate-800 border-slate-700"
              />
              <span className="text-xs text-slate-300">
                Inizializza con piatti di esempio e categorie dimostrative
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMostraModalCrea(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {isPending ? 'Creazione in corso...' : 'Conferma e Crea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabella Locali */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Locali Piattaforma</h2>
          <span className="text-xs text-slate-400">{locali.length} totali</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Locale &amp; Insegna</th>
                <th className="px-5 py-3">Slug Vetrina</th>
                <th className="px-5 py-3">Stato</th>
                <th className="px-5 py-3">Piano</th>
                <th className="px-5 py-3">Ordini / Fatturato</th>
                <th className="px-5 py-3">Gestori</th>
                <th className="px-5 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {locali.map((locale) => (
                <tr key={locale.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4 font-bold text-white">
                    {locale.branding?.nome || '—'}
                  </td>
                  <td className="px-5 py-4 font-mono text-sky-400">
                    <Link href={`/${locale.slug}`} target="_blank" className="hover:underline flex items-center gap-1">
                      /{locale.slug} <span>↗</span>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleStato(locale)}
                      disabled={isPending}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition ${
                        locale.stato === 'attivo'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                          : 'bg-red-950 text-red-400 border border-red-800 hover:bg-red-900'
                      }`}
                      title="Clicca per cambiare stato"
                    >
                      {locale.stato === 'attivo' ? '● Attivo' : '■ Sospeso'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={locale.piano}
                      onChange={(e) => handleCambiaPiano(locale.id, e.target.value)}
                      disabled={isPending}
                      className="px-2 py-1 bg-slate-800 text-slate-200 rounded-lg border border-slate-700 text-xs"
                    >
                      <option value="base">Base</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-200">{locale.ordiniCount} ordini</p>
                    <p className="text-[11px] text-slate-400">{formattaPrezzo(locale.fatturatoTotale)}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {locale.gestori.length > 0 ? (
                      <span title={locale.gestori.join(', ')}>
                        {locale.gestori[0]}
                        {locale.gestori.length > 1 && ` (+${locale.gestori.length - 1})`}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Nessun gestore</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/${locale.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      Apri Vetrina
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
