'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/formatters';
import { calcolaTotaleOrdine, type CartItem } from '@/lib/pricing';
import { creaOrdineAction } from '@/lib/actions/orders';

export interface AvailabilityData {
  modalita: string;
  ordiniAttivi: boolean;
  regole: {
    orarioLimiteOrdini: string;
    orarioLimiteAnnullamento: string;
    accettaContanti: boolean;
    accettaStripe: boolean;
  };
  giorniDisponibili: Array<{
    data: string;
    giornoSettimana: number;
    aperto: boolean;
    motivo?: string;
  }>;
  destinazioni: Array<{
    id: string;
    nome: string;
    indirizzo?: string;
    fasce: Array<{
      id: string;
      oraInizio: string;
      oraFine: string;
      giorniSettimana: number[];
    }>;
  }>;
  zoneConsegna: Array<{
    id: string;
    nome: string;
    costoCentesimi: number;
  }>;
}

interface CartDrawerProps {
  slug: string;
  items: CartItem[];
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  isOpen: boolean;
  onClose: () => void;
  availability: AvailabilityData | null;
  primaryColor: string;
  primaryTextColor: string;
}

export default function CartDrawer({
  slug,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  isOpen,
  onClose,
  availability,
  primaryColor,
  primaryTextColor,
}: CartDrawerProps) {
  const router = useRouter();

  // Tipo servizio
  const [tipoServizio, setTipoServizio] = useState<'destinazione_programmata' | 'domicilio' | 'ritiro'>('ritiro');
  const [destinazioneId, setDestinazioneId] = useState<string>('');
  const [zonaConsegnaId, setZonaConsegnaId] = useState<string>('');
  const [dataConsegna, setDataConsegna] = useState<string>('');
  const [fasciaOraria, setFasciaOraria] = useState<string>('12:30 - 13:00');
  const [indirizzoConsegna, setIndirizzoConsegna] = useState<string>('');

  // Dati cliente
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [note, setNote] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<'contanti' | 'carta'>('contanti');

  // Stato invio
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calcola costo consegna
  const zonaSelezionata = availability?.zoneConsegna.find((z) => z.id === zonaConsegnaId);
  const costoConsegna = tipoServizio === 'domicilio' ? (zonaSelezionata?.costoCentesimi || 0) : 0;

  // Calcola totale
  const calcolo = calcolaTotaleOrdine(items, { costoConsegnaCentesimi: costoConsegna });

  const giorniAperti = availability?.giorniDisponibili.filter((g) => g.aperto) || [];

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (items.length === 0) {
      setErrore('Il carrello è vuoto.');
      return;
    }

    if (!dataConsegna) {
      setErrore('Seleziona una data di consegna/ritiro.');
      return;
    }

    if (tipoServizio === 'destinazione_programmata' && !destinazioneId) {
      setErrore('Seleziona la destinazione di consegna.');
      return;
    }

    if (tipoServizio === 'domicilio' && !indirizzoConsegna.trim()) {
      setErrore('Inserisci l’indirizzo completo per la consegna a domicilio.');
      return;
    }

    setLoading(true);

    try {
      const res = await creaOrdineAction({
        localeSlug: slug,
        tipoServizio,
        dataConsegna,
        fasciaOraria,
        indirizzoConsegna: tipoServizio === 'domicilio' ? indirizzoConsegna : undefined,
        destinazioneId: tipoServizio === 'destinazione_programmata' ? destinazioneId : undefined,
        zonaConsegnaId: tipoServizio === 'domicilio' ? zonaConsegnaId : undefined,
        nomeCliente: nome,
        cognomeCliente: cognome,
        telefonoCliente: telefono,
        noteCliente: note,
        metodoPagamento,
        items,
      });

      if (!res.success || !res.codiceOrdine) {
        setErrore(res.errore || 'Errore nella creazione dell’ordine.');
        setLoading(false);
        return;
      }

      // Salva ordine in localStorage per "I miei ordini"
      try {
        const storageKey = `menugo_ordini_${slug}`;
        const prev = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updated = [{ codice: res.codiceOrdine, data: new Date().toISOString() }, ...prev];
        localStorage.setItem(storageKey, JSON.stringify(updated.slice(0, 30)));
      } catch {
        // Ignora errori localStorage
      }

      onClearCart();
      onClose();

      if (res.redirectUrl && res.redirectUrl.startsWith('http')) {
        window.location.href = res.redirectUrl;
      } else {
        router.push(res.redirectUrl || `/${slug}/ordine/${res.codiceOrdine}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore inatteso.';
      setErrore(msg);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Il tuo ordine</h2>
            <p className="text-xs text-slate-500">
              {items.length} {items.length === 1 ? 'prodotto' : 'prodotti'} nel carrello
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Contenuto scorrevole */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <span className="text-4xl block mb-2">🛒</span>
              <p className="text-sm font-medium">Il carrello è vuoto</p>
              <p className="text-xs mt-1 text-slate-400">Aggiungi piatti dal menu per ordinare</p>
            </div>
          ) : (
            <>
              {/* Lista Prodotti */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Piatti selezionati</h3>
                <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl p-3 border border-slate-200">
                  {items.map((it, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{it.nome}</p>
                        {it.tipo === 'prodotto' && it.opzioni && it.opzioni.length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {it.opzioni.map((o) => o.nome).join(', ')}
                          </p>
                        )}
                        {it.tipo === 'menu_fisso' && it.scelteSlot && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {it.scelteSlot.filter((s) => s.nomeProdotto).map((s) => `${s.nomeSlot}: ${s.nomeProdotto}`).join(' • ')}
                          </p>
                        )}
                        <p className="text-emerald-700 font-bold mt-1">
                          {formatPrice(
                            it.tipo === 'prodotto'
                              ? (it.prezzoUnitarioCentesimi + (it.opzioni || []).reduce((acc, o) => acc + (o.prezzoExtraCentesimi || 0), 0)) * it.quantita
                              : it.tipo === 'menu_fisso'
                              ? it.prezzoFissoCentesimi * it.quantita
                              : it.prezzoUnitarioCentesimi * it.quantita
                          )}
                        </p>
                      </div>

                      {/* Quantità */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(idx, it.quantita - 1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="font-semibold text-slate-800 w-4 text-center">{it.quantita}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(idx, it.quantita + 1)}
                          className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form di Servizio e Consegna */}
              <form id="order-form" onSubmit={handleSubmitOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Tipo di Servizio
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTipoServizio('ritiro')}
                      className={`p-2.5 rounded-xl border font-semibold text-center transition ${
                        tipoServizio === 'ritiro'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🏃 Ritiro
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoServizio('domicilio')}
                      className={`p-2.5 rounded-xl border font-semibold text-center transition ${
                        tipoServizio === 'domicilio'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🛵 Domicilio
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoServizio('destinazione_programmata')}
                      className={`p-2.5 rounded-xl border font-semibold text-center transition ${
                        tipoServizio === 'destinazione_programmata'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      🏢 Punto Fisso
                    </button>
                  </div>
                </div>

                {/* Selezione Data */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giorno di Consegna / Ritiro *
                  </label>
                  <select
                    value={dataConsegna}
                    onChange={(e) => setDataConsegna(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="">-- Seleziona giorno disponibile --</option>
                    {giorniAperti.map((g) => (
                      <option key={g.data} value={g.data}>
                        {new Date(g.data).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selezione Fascia Oraria */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fascia Oraria Desiderata
                  </label>
                  <input
                    type="text"
                    value={fasciaOraria}
                    onChange={(e) => setFasciaOraria(e.target.value)}
                    placeholder="es. 12:30 - 13:00 o 20:00"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>

                {/* Destinazione Programmata */}
                {tipoServizio === 'destinazione_programmata' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Punto di Consegna *
                    </label>
                    <select
                      value={destinazioneId}
                      onChange={(e) => setDestinazioneId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    >
                      <option value="">-- Seleziona sede aziendale / mensa --</option>
                      {availability?.destinazioni.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome} {d.indirizzo ? `(${d.indirizzo})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Consegna a domicilio */}
                {tipoServizio === 'domicilio' && (
                  <div className="space-y-3">
                    {availability?.zoneConsegna && availability.zoneConsegna.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Zona di Consegna
                        </label>
                        <select
                          value={zonaConsegnaId}
                          onChange={(e) => setZonaConsegnaId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                        >
                          <option value="">Tariffa standard</option>
                          {availability.zoneConsegna.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.nome} (+{formatPrice(z.costoCentesimi)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Indirizzo Completo *
                      </label>
                      <input
                        type="text"
                        value={indirizzoConsegna}
                        onChange={(e) => setIndirizzoConsegna(e.target.value)}
                        placeholder="Via, civico, piano, citofono"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Dati Cliente */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">I tuoi dati</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Nome *"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={cognome}
                        onChange={(e) => setCognome(e.target.value)}
                        placeholder="Cognome *"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Cellulare (per aggiornamenti) *"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Note per la cucina o per la consegna (opzionale)"
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                {/* Metodo Pagamento */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Metodo di Pagamento
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer text-xs ${metodoPagamento === 'contanti' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="metodoPagamento"
                        value="contanti"
                        checked={metodoPagamento === 'contanti'}
                        onChange={() => setMetodoPagamento('contanti')}
                        className="text-emerald-600"
                      />
                      <span className="font-medium text-slate-800">💵 Contanti</span>
                    </label>

                    {(availability?.regole?.accettaStripe ?? true) && (
                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer text-xs ${metodoPagamento === 'carta' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input
                          type="radio"
                          name="metodoPagamento"
                          value="carta"
                          checked={metodoPagamento === 'carta'}
                          onChange={() => setMetodoPagamento('carta')}
                          className="text-emerald-600"
                        />
                        <span className="font-medium text-slate-800">💳 Carta di Credito (Stripe)</span>
                      </label>
                    )}
                  </div>
                </div>

                {errore && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {errore}
                  </div>
                )}
              </form>
            </>
          )}
        </div>

        {/* Footer Riepilogo e Invio */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotale piatti</span>
                <span>{formatPrice(calcolo.subtotaleProdottiCentesimi)}</span>
              </div>
              {costoConsegna > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Costo consegna</span>
                  <span>+{formatPrice(costoConsegna)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-slate-900 text-base pt-1 border-t border-slate-200">
                <span>Totale ordine</span>
                <span>{formatPrice(calcolo.totaleCentesimi)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="order-form"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm shadow-md transition disabled:opacity-60"
              style={{
                backgroundColor: primaryColor,
                color: primaryTextColor,
              }}
            >
              {loading ? 'Invio ordine in corso…' : `Invia Ordine (${formatPrice(calcolo.totaleCentesimi)})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
