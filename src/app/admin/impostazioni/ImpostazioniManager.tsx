'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { salvaImpostazioniLocaleAction } from '@/lib/actions/admin-orders';

export interface LocaleSettingsData {
  modalita: 'solo_vetrina' | 'vetrina_ordini';
  orario_limite_ordini: string;
  orario_limite_giorni_anticipo: number;
  lunedi_chiude_sabato: boolean;
  orario_limite_annullamento: string;
  accetta_contanti: boolean;
  accetta_stripe: boolean;
  commissione_carta_tipo: 'nessuna' | 'fissa' | 'percentuale';
  commissione_carta_valore: number;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  link_mappa: string | null;
  link_instagram: string | null;
  link_facebook: string | null;
  testo_ricevuta: string | null;
  testo_privacy: string | null;
  mesi_conservazione_ordini: number;
}

interface ImpostazioniManagerProps {
  localeId: string;
  initialSettings: LocaleSettingsData;
}

export default function ImpostazioniManager({ localeId, initialSettings }: ImpostazioniManagerProps) {
  const [formData, setFormData] = useState<LocaleSettingsData>({
    modalita: initialSettings?.modalita || 'vetrina_ordini',
    orario_limite_ordini: initialSettings?.orario_limite_ordini?.slice(0, 5) || '14:00',
    orario_limite_giorni_anticipo: initialSettings?.orario_limite_giorni_anticipo ?? 1,
    lunedi_chiude_sabato: initialSettings?.lunedi_chiude_sabato ?? false,
    orario_limite_annullamento: initialSettings?.orario_limite_annullamento?.slice(0, 5) || '09:00',
    accetta_contanti: initialSettings?.accetta_contanti ?? true,
    accetta_stripe: initialSettings?.accetta_stripe ?? false,
    commissione_carta_tipo: initialSettings?.commissione_carta_tipo || 'nessuna',
    commissione_carta_valore: initialSettings?.commissione_carta_valore ?? 0,
    telefono: initialSettings?.telefono || '',
    email: initialSettings?.email || '',
    indirizzo: initialSettings?.indirizzo || '',
    link_mappa: initialSettings?.link_mappa || '',
    link_instagram: initialSettings?.link_instagram || '',
    link_facebook: initialSettings?.link_facebook || '',
    testo_ricevuta: initialSettings?.testo_ricevuta || 'Grazie per il tuo ordine! Ti aspettiamo per il ritiro o la consegna.',
    testo_privacy: initialSettings?.testo_privacy || '',
    mesi_conservazione_ordini: initialSettings?.mesi_conservazione_ordini ?? 12,
  });

  const [isPending, startTransition] = useTransition();
  const [messaggio, setMessaggio] = useState<{ tipo: 'successo' | 'errore'; testo: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessaggio(null);

    startTransition(async () => {
      const res = await salvaImpostazioniLocaleAction(localeId, {
        ...formData,
        orario_limite_ordini: `${formData.orario_limite_ordini}:00`,
        orario_limite_annullamento: `${formData.orario_limite_annullamento}:00`,
        commissione_carta_valore: Number(formData.commissione_carta_valore) || 0,
        mesi_conservazione_ordini: Number(formData.mesi_conservazione_ordini) || 12,
        orario_limite_giorni_anticipo: Number(formData.orario_limite_giorni_anticipo) || 0,
      });

      if (res.success) {
        setMessaggio({ tipo: 'successo', testo: 'Impostazioni salvate con successo!' });
        setTimeout(() => setMessaggio(null), 4000);
      } else {
        setMessaggio({ tipo: 'errore', testo: `Errore durante il salvataggio: ${res.errore}` });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <Link href="/admin" className="hover:underline">
              ← Dashboard
            </Link>
            <span>/</span>
            <span>Impostazioni Generali</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Configurazione Negozio &amp; Orari</h1>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors disabled:opacity-50"
        >
          {isPending ? 'Salvataggio...' : 'Salva Impostazioni'}
        </button>
      </div>

      {messaggio && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border ${
            messaggio.tipo === 'successo'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {messaggio.testo}
        </div>
      )}

      {/* Regole Orarie & Ordini */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          ⏰ Regole Orarie e Tempistiche Ordini
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Orario Limite Invio Ordini (stesso giorno)
            </label>
            <input
              type="time"
              value={formData.orario_limite_ordini}
              onChange={(e) => setFormData({ ...formData, orario_limite_ordini: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Es: 14:00. Oltre questo orario non si può ordinare per la data odierna.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Orario Limite Annullamento Cliente
            </label>
            <input
              type="time"
              value={formData.orario_limite_annullamento}
              onChange={(e) => setFormData({ ...formData, orario_limite_annullamento: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Es: 09:00 del mattino della data di consegna/ritiro.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giorni Minimi di Anticipo
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={formData.orario_limite_giorni_anticipo}
              onChange={(e) => setFormData({ ...formData, orario_limite_giorni_anticipo: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              0 = si può ordinare per oggi; 1 = almeno per domani.
            </p>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.lunedi_chiude_sabato}
                onChange={(e) => setFormData({ ...formData, lunedi_chiude_sabato: e.target.checked })}
                className="w-5 h-5 text-emerald-600 rounded border-slate-300"
              />
              <span className="text-sm font-semibold text-slate-800">
                Regola Speciale: Ordini per Lunedì si chiudono Sabato
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Pagamenti & Supplementi */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          💳 Modalità di Pagamento &amp; Supplementi
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.accetta_contanti}
              onChange={(e) => setFormData({ ...formData, accetta_contanti: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded border-slate-300"
            />
            <div>
              <p className="text-sm font-bold text-slate-800">Accetta Contanti alla Consegna / al Ritiro</p>
              <p className="text-[11px] text-slate-500">I clienti pagano direttamente al fattorino o alla cassa.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.accetta_stripe}
              onChange={(e) => setFormData({ ...formData, accetta_stripe: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded border-slate-300"
            />
            <div>
              <p className="text-sm font-bold text-slate-800">Accetta Pagamenti Online (Stripe)</p>
              <p className="text-[11px] text-slate-500">Carte di credito, debito e prepagate.</p>
            </div>
          </label>
        </div>

        {/* Gestione supplemento carta con avviso legale obbligatorio */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
          <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>⚠️</span> Avviso Legale Importante per l&apos;Italia:
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            In Italia, in generale, non sono ammessi supplementi sui pagamenti con carte di credito/debito di consumatori privati (art. 62 Codice del Consumo e direttiva PSD2): verifica con il tuo commercialista o consulente legale prima di attivare qualsiasi maggiorazione.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Tipo Supplemento Carta
              </label>
              <select
                value={formData.commissione_carta_tipo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commissione_carta_tipo: e.target.value as 'nessuna' | 'fissa' | 'percentuale',
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="nessuna">Nessun supplemento (Consigliato)</option>
                <option value="fissa">Quota Fissa (centesimi, es. 50 = 0,50 €)</option>
                <option value="percentuale">Percentuale (es. 200 = 2.00%)</option>
              </select>
            </div>

            {formData.commissione_carta_tipo !== 'nessuna' && (
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Valore Supplemento ({formData.commissione_carta_tipo === 'fissa' ? 'centesimi €' : 'centesimi di %'})
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.commissione_carta_valore}
                  onChange={(e) =>
                    setFormData({ ...formData, commissione_carta_valore: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recapiti e Contatti */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          📍 Contatti &amp; Social del Locale
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefono / WhatsApp</label>
            <input
              type="text"
              value={formData.telefono || ''}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="es. +39 06 1234567"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Pubblica</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="es. info@trattoriademo.it"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Indirizzo Fisico</label>
            <input
              type="text"
              value={formData.indirizzo || ''}
              onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
              placeholder="es. Via Roma 12, 00100 Roma"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Link Google Maps</label>
            <input
              type="url"
              value={formData.link_mappa || ''}
              onChange={(e) => setFormData({ ...formData, link_mappa: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Link Instagram</label>
            <input
              type="url"
              value={formData.link_instagram || ''}
              onChange={(e) => setFormData({ ...formData, link_instagram: e.target.value })}
              placeholder="https://instagram.com/tuolocale"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Link Facebook</label>
            <input
              type="url"
              value={formData.link_facebook || ''}
              onChange={(e) => setFormData({ ...formData, link_facebook: e.target.value })}
              placeholder="https://facebook.com/tuolocale"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Testi Ricevuta & Privacy & Conservazione Dati */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          📄 Testi Ricevuta, Privacy &amp; GDPR
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Messaggio di Ringraziamento in Ricevuta
          </label>
          <textarea
            rows={2}
            value={formData.testo_ricevuta || ''}
            onChange={(e) => setFormData({ ...formData, testo_ricevuta: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Informativa Privacy Personalizzata (Markdown o testo semplice)
          </label>
          <textarea
            rows={3}
            value={formData.testo_privacy || ''}
            onChange={(e) => setFormData({ ...formData, testo_privacy: e.target.value })}
            placeholder="Lascia vuoto per utilizzare il testo informativo standard GDPR."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Conservazione Storico Ordini (Mesi prima dell&apos;anonimizzazione GDPR)
          </label>
          <input
            type="number"
            min="1"
            max="120"
            value={formData.mesi_conservazione_ordini}
            onChange={(e) => setFormData({ ...formData, mesi_conservazione_ordini: parseInt(e.target.value) || 12 })}
            className="w-full max-w-xs px-3 py-2 rounded-xl border border-slate-300 text-sm"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Trascorso questo periodo i dati personali dei clienti (nome, telefono, indirizzo) vengono anonimizzati automaticamente mantenendo le statistiche aggregate di vendita.
          </p>
        </div>
      </div>
    </form>
  );
}
