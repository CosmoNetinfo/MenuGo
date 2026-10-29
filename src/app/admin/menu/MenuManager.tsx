'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { LISTA_ALLERGENI_UE, formatPrice } from '@/lib/formatters';
import {
  creaCategoriaAction,
  eliminaCategoriaAction,
  aggiornaCategoriaAction,
  creaProdottoAction,
  eliminaProdottoAction,
  aggiornaProdottoAction,
  creaGruppoOpzioniAction,
  eliminaGruppoOpzioniAction,
  creaOpzioneAction,
  eliminaOpzioneAction,
  creaMenuFissoAction,
  eliminaMenuFissoAction,
  creaPiattoDelGiornoAction,
  eliminaPiattoDelGiornoAction,
} from '@/lib/actions/menu';
import type { CategoriaConProdotti, MenuFissoConSlot } from '@/lib/queries/locale';
import type { Database } from '@/types/database';

type PiattoDelGiorno = Database['public']['Tables']['piatti_del_giorno']['Row'];

interface MenuManagerProps {
  localeId: string;
  localeSlug: string;
  initialCategorie: CategoriaConProdotti[];
  initialMenuFissi: MenuFissoConSlot[];
  initialPiattiDelGiorno: PiattoDelGiorno[];
}

const GIORNI_SETTIMANA = [
  { id: 1, label: 'Lunedì' },
  { id: 2, label: 'Martedì' },
  { id: 3, label: 'Mercoledì' },
  { id: 4, label: 'Giovedì' },
  { id: 5, label: 'Venerdì' },
  { id: 6, label: 'Sabato' },
  { id: 7, label: 'Domenica' },
];

export default function MenuManager({
  localeId,
  localeSlug,
  initialCategorie,
  initialMenuFissi,
  initialPiattiDelGiorno,
}: MenuManagerProps) {
  const [activeTab, setActiveTab] = useState<'prodotti' | 'categorie' | 'menufissi' | 'fuorimenu'>('prodotti');
  const [isPending, startTransition] = useTransition();
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'err'; testo: string } | null>(null);

  // Form stati per nuova categoria
  const [nuovaCatNome, setNuovaCatNome] = useState('');
  const [nuovaCatDesc, setNuovaCatDesc] = useState('');

  // Form stati per nuovo prodotto
  const [mostraFormProdotto, setMostraFormProdotto] = useState(false);
  const [prodCategoriaId, setProdCategoriaId] = useState(initialCategorie[0]?.id || '');
  const [prodNome, setProdNome] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrezzoEuro, setProdPrezzoEuro] = useState('10.00');
  const [prodFotoUrl, setProdFotoUrl] = useState('');
  const [prodAllergeni, setProdAllergeni] = useState<number[]>([]);
  const [prodInEvidenza, setProdInEvidenza] = useState(false);

  // Form stati per varianti/opzioni su un prodotto selezionato
  const [prodottoPerVarianti, setProdottoPerVarianti] = useState<string | null>(null);
  const [nomeGruppo, setNomeGruppo] = useState('');
  const [gruppoObbligatorio, setGruppoObbligatorio] = useState(false);
  const [nomeOpzione, setNomeOpzione] = useState('');
  const [prezzoExtraEuro, setPrezzoExtraEuro] = useState('1.50');
  const [gruppoTargetId, setGruppoTargetId] = useState('');

  // Form stati per nuovo menu fisso
  const [mostraFormMenuFisso, setMostraFormMenuFisso] = useState(false);
  const [menuFissoNome, setMenuFissoNome] = useState('');
  const [menuFissoDesc, setMenuFissoDesc] = useState('');
  const [menuFissoPrezzoEuro, setMenuFissoPrezzoEuro] = useState('13.00');
  const [slotsMenuFisso, setSlotsMenuFisso] = useState<
    Array<{ nome: string; categoriaId?: string; facoltativo: boolean }>
  >([
    { nome: 'Primo', facoltativo: false },
    { nome: 'Secondo', facoltativo: false },
    { nome: 'Contorno', facoltativo: true },
  ]);

  // Form stati per nuovo piatto del giorno
  const [mostraFormPdg, setMostraFormPdg] = useState(false);
  const [pdgNome, setPdgNome] = useState('');
  const [pdgDesc, setPdgDesc] = useState('');
  const [pdgPrezzoEuro, setPdgPrezzoEuro] = useState('12.00');
  const [pdgFotoUrl, setPdgFotoUrl] = useState('');
  const [pdgGiorni, setPdgGiorni] = useState<number[]>([1, 2, 3, 4, 5]);

  function showNotifica(tipo: 'ok' | 'err', testo: string) {
    setMessaggio({ tipo, testo });
    setTimeout(() => setMessaggio(null), 5000);
  }

  // Helper toggle allergeni
  function toggleAllergene(id: number) {
    if (prodAllergeni.includes(id)) {
      setProdAllergeni(prodAllergeni.filter((x) => x !== id));
    } else {
      setProdAllergeni([...prodAllergeni, id]);
    }
  }

  // 1. Handlers Categorie
  function handleCreaCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!nuovaCatNome.trim()) return;

    startTransition(async () => {
      const res = await creaCategoriaAction(localeId, {
        nome: nuovaCatNome,
        descrizione: nuovaCatDesc,
        ordine: initialCategorie.length,
      });

      if (res.success) {
        setNuovaCatNome('');
        setNuovaCatDesc('');
        showNotifica('ok', 'Categoria creata con successo!');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  function handleEliminaCategoria(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questa categoria e tutti i piatti collegati?')) return;
    startTransition(async () => {
      const res = await eliminaCategoriaAction(localeId, id);
      if (res.success) {
        showNotifica('ok', 'Categoria eliminata.');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  function handleToggleVisibilitaCategoria(id: string, visibileAttuale: boolean) {
    startTransition(async () => {
      await aggiornaCategoriaAction(localeId, id, { visibile: !visibileAttuale });
    });
  }

  // 2. Handlers Prodotti
  function handleCreaProdotto(e: React.FormEvent) {
    e.preventDefault();
    if (!prodNome.trim() || !prodCategoriaId) return;

    const prezzoCentesimi = Math.round(parseFloat(prodPrezzoEuro.replace(',', '.')) * 100);

    startTransition(async () => {
      const res = await creaProdottoAction(localeId, {
        categoriaId: prodCategoriaId,
        nome: prodNome,
        descrizione: prodDesc,
        prezzoCentesimi,
        fotoUrl: prodFotoUrl || undefined,
        allergeni: prodAllergeni,
        inEvidenza: prodInEvidenza,
      });

      if (res.success) {
        setProdNome('');
        setProdDesc('');
        setProdFotoUrl('');
        setProdAllergeni([]);
        setProdInEvidenza(false);
        setMostraFormProdotto(false);
        showNotifica('ok', 'Piatto aggiunto con successo!');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  function handleEliminaProdotto(id: string) {
    if (!confirm('Eliminare questo piatto dal menu?')) return;
    startTransition(async () => {
      const res = await eliminaProdottoAction(localeId, id);
      if (res.success) {
        showNotifica('ok', 'Piatto eliminato.');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  function handleToggleDisponibileProdotto(id: string, disponibileAttuale: boolean) {
    startTransition(async () => {
      await aggiornaProdottoAction(localeId, id, { disponibile: !disponibileAttuale });
    });
  }

  // 3. Handlers Opzioni / Varianti
  function handleCreaGruppoOpzioni(prodottoId: string) {
    if (!nomeGruppo.trim()) return;
    startTransition(async () => {
      const res = await creaGruppoOpzioniAction(localeId, {
        prodottoId,
        nome: nomeGruppo,
        obbligatorio: gruppoObbligatorio,
      });
      if (res.success) {
        setNomeGruppo('');
        showNotifica('ok', 'Gruppo varianti creato!');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  function handleCreaOpzione(gruppoId: string) {
    if (!nomeOpzione.trim()) return;
    const extraCentesimi = Math.round(parseFloat(prezzoExtraEuro.replace(',', '.')) * 100);

    startTransition(async () => {
      const res = await creaOpzioneAction(localeId, {
        gruppoId,
        nome: nomeOpzione,
        prezzoExtraCentesimi: extraCentesimi,
      });
      if (res.success) {
        setNomeOpzione('');
        showNotifica('ok', 'Opzione aggiunta!');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  // 4. Handlers Menu Fissi
  function handleCreaMenuFisso(e: React.FormEvent) {
    e.preventDefault();
    if (!menuFissoNome.trim()) return;
    const prezzoCentesimi = Math.round(parseFloat(menuFissoPrezzoEuro.replace(',', '.')) * 100);

    startTransition(async () => {
      const res = await creaMenuFissoAction(localeId, {
        nome: menuFissoNome,
        descrizione: menuFissoDesc,
        prezzoCentesimi,
        slots: slotsMenuFisso,
      });

      if (res.success) {
        setMenuFissoNome('');
        setMenuFissoDesc('');
        setMostraFormMenuFisso(false);
        showNotifica('ok', 'Menu Fisso a combinazione creato con successo!');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  function handleEliminaMenuFisso(id: string) {
    if (!confirm('Eliminare questo menu fisso?')) return;
    startTransition(async () => {
      await eliminaMenuFissoAction(localeId, id);
      showNotifica('ok', 'Menu fisso eliminato.');
    });
  }

  // 5. Handlers Piatto del Giorno
  function handleCreaPiattoDelGiorno(e: React.FormEvent) {
    e.preventDefault();
    if (!pdgNome.trim()) return;
    const prezzoCentesimi = Math.round(parseFloat(pdgPrezzoEuro.replace(',', '.')) * 100);

    startTransition(async () => {
      const res = await creaPiattoDelGiornoAction(localeId, {
        nome: pdgNome,
        descrizione: pdgDesc,
        prezzoCentesimi,
        fotoUrl: pdgFotoUrl || undefined,
        giorniDisponibilita: pdgGiorni,
      });

      if (res.success) {
        setPdgNome('');
        setPdgDesc('');
        setPdgFotoUrl('');
        setMostraFormPdg(false);
        showNotifica('ok', 'Piatto del giorno inserito!');
      } else {
        showNotifica('err', `Errore: ${res.errore}`);
      }
    });
  }

  function handleEliminaPiattoDelGiorno(id: string) {
    if (!confirm('Eliminare questo piatto del giorno?')) return;
    startTransition(async () => {
      await eliminaPiattoDelGiornoAction(localeId, id);
      showNotifica('ok', 'Piatto del giorno eliminato.');
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
            <span>Menu & Piatti</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Gestione Menu del Locale
          </h1>
        </div>

        <Link
          href={`/${localeSlug}`}
          target="_blank"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition self-start sm:self-auto"
        >
          🌐 Vedi Vetrina Online →
        </Link>
      </div>

      {/* Messaggi notifica */}
      {messaggio && (
        <div
          role="status"
          className={`p-4 rounded-xl text-sm font-medium border ${
            messaggio.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {messaggio.testo}
        </div>
      )}

      {/* Barra di Navigazione Tab */}
      <div className="flex overflow-x-auto gap-2 bg-slate-200/70 p-1.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700">
        <button
          onClick={() => setActiveTab('prodotti')}
          className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === 'prodotti' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-white/50'
          }`}
        >
          🍽️ Piatti ({initialCategorie.flatMap((c) => c.prodotti).length})
        </button>
        <button
          onClick={() => setActiveTab('categorie')}
          className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === 'categorie' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-white/50'
          }`}
        >
          📂 Categorie ({initialCategorie.length})
        </button>
        <button
          onClick={() => setActiveTab('menufissi')}
          className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === 'menufissi' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-white/50'
          }`}
        >
          ⭐ Menu Fissi ({initialMenuFissi.length})
        </button>
        <button
          onClick={() => setActiveTab('fuorimenu')}
          className={`px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
            activeTab === 'fuorimenu' ? 'bg-white text-slate-900 shadow-xs' : 'hover:bg-white/50'
          }`}
        >
          📅 Piatti del Giorno ({initialPiattiDelGiorno.length})
        </button>
      </div>

      {/* TAB 1: PRODOTTI */}
      {activeTab === 'prodotti' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Catalogo Piatti</h2>
            <button
              onClick={() => setMostraFormProdotto(!mostraFormProdotto)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
            >
              {mostraFormProdotto ? 'Chiudi Form' : '+ Aggiungi Piatto'}
            </button>
          </div>

          {/* Form Nuovo Prodotto */}
          {mostraFormProdotto && (
            <form
              onSubmit={handleCreaProdotto}
              className="bg-white p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-xs space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Nuovo Piatto nel Menu</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={prodCategoriaId}
                    onChange={(e) => setProdCategoriaId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    {initialCategorie.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome del Piatto *
                  </label>
                  <input
                    type="text"
                    value={prodNome}
                    onChange={(e) => setProdNome(e.target.value)}
                    placeholder="es. Spaghetti alle Vongole"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrizione / Ingredienti
                  </label>
                  <textarea
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    rows={2}
                    placeholder="Descrivi brevemente il piatto..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prezzo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={prodPrezzoEuro}
                    onChange={(e) => setProdPrezzoEuro(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Foto (PNG, JPG, WebP)
                  </label>
                  <input
                    type="url"
                    value={prodFotoUrl}
                    onChange={(e) => setProdFotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Allergeni UE */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Allergeni Presenti (14 standard UE)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {LISTA_ALLERGENI_UE.map((all) => (
                    <label
                      key={all.numero}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={prodAllergeni.includes(all.numero)}
                        onChange={() => toggleAllergene(all.numero)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        <strong className="text-slate-500">{all.numero}.</strong> {all.nome}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodInEvidenza}
                    onChange={(e) => setProdInEvidenza(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Metti in evidenza in cima al menu</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostraFormProdotto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                >
                  {isPending ? 'Salvataggio…' : 'Salva Piatto'}
                </button>
              </div>
            </form>
          )}

          {/* Lista Piatti Divisi per Categoria */}
          <div className="space-y-6">
            {initialCategorie.map((cat) => (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>{cat.nome}</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({cat.prodotti.length} piatti)
                    </span>
                  </h3>
                </div>

                {cat.prodotti.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nessun piatto in questa categoria.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cat.prodotti.map((p) => (
                      <div key={p.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{p.nome}</span>
                              {p.in_evidenza && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  ⭐ In evidenza
                                </span>
                              )}
                              {!p.disponibile && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                  Esaurito
                                </span>
                              )}
                            </div>
                            {p.descrizione && (
                              <p className="text-xs text-slate-500 mt-0.5">{p.descrizione}</p>
                            )}
                            <p className="text-xs font-bold text-emerald-700 mt-1">
                              {formatPrice(p.prezzo)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleDisponibileProdotto(p.id, p.disponibile)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                p.disponibile
                                  ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {p.disponibile ? 'Segna Esaurito' : 'Rendi Disponibile'}
                            </button>
                            <button
                              onClick={() =>
                                setProdottoPerVarianti(prodottoPerVarianti === p.id ? null : p.id)
                              }
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                            >
                              Varianti ({p.gruppiOpzioni?.length || 0})
                            </button>
                            <button
                              onClick={() => handleEliminaProdotto(p.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            >
                              Elimina
                            </button>
                          </div>
                        </div>

                        {/* Sezione Varianti e Opzioni del Piatto */}
                        {prodottoPerVarianti === p.id && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mt-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Gruppi di Scelta & Varianti per {p.nome}
                              </h4>
                            </div>

                            {/* Elenco Gruppi */}
                            <div className="space-y-3">
                              {p.gruppiOpzioni?.map((gr) => (
                                <div key={gr.id} className="bg-white p-3 rounded-lg border border-slate-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-900">
                                        {gr.nome}
                                      </span>
                                      {gr.obbligatorio && (
                                        <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-sm font-semibold">
                                          Obbligatorio
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => eliminaGruppoOpzioniAction(localeId, gr.id)}
                                      className="text-xs text-red-600 hover:underline"
                                    >
                                      Rimuovi gruppo
                                    </button>
                                  </div>

                                  {/* Opzioni del Gruppo */}
                                  <div className="space-y-1.5 pl-2 mb-2">
                                    {gr.opzioni?.map((opz) => (
                                      <div
                                        key={opz.id}
                                        className="flex items-center justify-between text-xs text-slate-700 py-0.5 border-b border-slate-50"
                                      >
                                        <span>
                                          {opz.nome}{' '}
                                          {opz.prezzo_extra > 0 && (
                                            <span className="text-emerald-700 font-semibold">
                                              (+{formatPrice(opz.prezzo_extra)})
                                            </span>
                                          )}
                                        </span>
                                        <button
                                          onClick={() => eliminaOpzioneAction(localeId, opz.id)}
                                          className="text-[10px] text-slate-400 hover:text-red-600"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Aggiunta nuova opzione al gruppo */}
                                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                                    <input
                                      type="text"
                                      placeholder="Nome opzione (es. Porzione Grande)"
                                      value={gruppoTargetId === gr.id ? nomeOpzione : ''}
                                      onChange={(e) => {
                                        setGruppoTargetId(gr.id);
                                        setNomeOpzione(e.target.value);
                                      }}
                                      className="flex-1 px-2.5 py-1 rounded-md border border-slate-300 text-xs"
                                    />
                                    <input
                                      type="number"
                                      step="0.50"
                                      min="0"
                                      placeholder="Extra €"
                                      value={gruppoTargetId === gr.id ? prezzoExtraEuro : '1.50'}
                                      onChange={(e) => {
                                        setGruppoTargetId(gr.id);
                                        setPrezzoExtraEuro(e.target.value);
                                      }}
                                      className="w-20 px-2 py-1 rounded-md border border-slate-300 text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCreaOpzione(gr.id)}
                                      className="px-3 py-1 rounded-md bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
                                    >
                                      + Aggiungi
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Crea Nuovo Gruppo */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                              <input
                                type="text"
                                placeholder="Nome gruppo (es. Cottura, Formato, Aggiunte)"
                                value={nomeGruppo}
                                onChange={(e) => setNomeGruppo(e.target.value)}
                                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                              />
                              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={gruppoObbligatorio}
                                  onChange={(e) => setGruppoObbligatorio(e.target.checked)}
                                  className="rounded text-emerald-600"
                                />
                                <span>Obbligatorio</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleCreaGruppoOpzioni(p.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                              >
                                + Crea Gruppo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIE */}
      {activeTab === 'categorie' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreaCategoria}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">Aggiungi Categoria Menu</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Categoria *
                </label>
                <input
                  type="text"
                  value={nuovaCatNome}
                  onChange={(e) => setNuovaCatNome(e.target.value)}
                  placeholder="es. Primi Piatti, Pizze Speciali, Dolci"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <input
                  type="text"
                  value={nuovaCatDesc}
                  onChange={(e) => setNuovaCatDesc(e.target.value)}
                  placeholder="es. Pasta fresca fatta a mano tutti i giorni"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
            >
              {isPending ? 'Creazione…' : '+ Salva Categoria'}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 mb-4">Categorie Esistenti</h3>
            <div className="divide-y divide-slate-100">
              {initialCategorie.map((cat) => (
                <div key={cat.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-sm text-slate-900">{cat.nome}</span>
                    {cat.descrizione && (
                      <p className="text-xs text-slate-500">{cat.descrizione}</p>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {cat.prodotti.length} piatti associati
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleVisibilitaCategoria(cat.id, cat.visibile)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                        cat.visibile
                          ? 'bg-slate-50 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {cat.visibile ? 'Visibile' : 'Nascosta'}
                    </button>
                    <button
                      onClick={() => handleEliminaCategoria(cat.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MENU FISSI */}
      {activeTab === 'menufissi' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Menu Fissi & Combinazioni</h2>
              <p className="text-xs text-slate-500">
                Crea formule promozionali a prezzo bloccato (es. Primo + Secondo = 13,00 €).
              </p>
            </div>
            <button
              onClick={() => setMostraFormMenuFisso(!mostraFormMenuFisso)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
            >
              {mostraFormMenuFisso ? 'Chiudi' : '+ Crea Menu Fisso'}
            </button>
          </div>

          {mostraFormMenuFisso && (
            <form
              onSubmit={handleCreaMenuFisso}
              className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-4"
            >
              <h3 className="font-bold text-base text-slate-900">Nuovo Menu Fisso</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Menu *
                  </label>
                  <input
                    type="text"
                    value={menuFissoNome}
                    onChange={(e) => setMenuFissoNome(e.target.value)}
                    placeholder="es. Menu Pranzo Lavoro"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prezzo Fisso Totale (€) *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={menuFissoPrezzoEuro}
                    onChange={(e) => setMenuFissoPrezzoEuro(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={menuFissoDesc}
                    onChange={(e) => setMenuFissoDesc(e.target.value)}
                    placeholder="es. Include acqua, coperto e pane"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Slot del menu fisso */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Composizione Slot del Menu
                </label>
                {slotsMenuFisso.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      value={slot.nome}
                      onChange={(e) => {
                        const copy = [...slotsMenuFisso];
                        copy[idx].nome = e.target.value;
                        setSlotsMenuFisso(copy);
                      }}
                      placeholder="Nome slot (es. Primo)"
                      className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs"
                    />
                    <select
                      value={slot.categoriaId || ''}
                      onChange={(e) => {
                        const copy = [...slotsMenuFisso];
                        copy[idx].categoriaId = e.target.value || undefined;
                        setSlotsMenuFisso(copy);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="">Tutte le categorie</option>
                      {initialCategorie.map((c) => (
                        <option key={c.id} value={c.id}>
                          Solo: {c.nome}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slot.facoltativo}
                        onChange={(e) => {
                          const copy = [...slotsMenuFisso];
                          copy[idx].facoltativo = e.target.checked;
                          setSlotsMenuFisso(copy);
                        }}
                        className="rounded text-emerald-600"
                      />
                      <span>Facoltativo</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSlotsMenuFisso(slotsMenuFisso.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setSlotsMenuFisso([
                      ...slotsMenuFisso,
                      { nome: `Portata ${slotsMenuFisso.length + 1}`, facoltativo: false },
                    ])
                  }
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  + Aggiungi un altro slot portata
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostraFormMenuFisso(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {isPending ? 'Salvataggio…' : 'Crea Menu Fisso'}
                </button>
              </div>
            </form>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {initialMenuFissi.map((mf) => (
              <div key={mf.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{mf.nome}</h3>
                    {mf.descrizione && (
                      <p className="text-xs text-slate-500 mt-0.5">{mf.descrizione}</p>
                    )}
                    <span className="text-sm font-extrabold text-emerald-700 mt-1 inline-block">
                      {formatPrice(mf.prezzo)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEliminaMenuFisso(mf.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Elimina
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Slot inclusi:
                  </span>
                  {mf.slots.map((s) => (
                    <div key={s.id} className="text-xs text-slate-700 flex items-center justify-between">
                      <span>• {s.nome}</span>
                      {s.facoltativo && (
                        <span className="text-[10px] text-slate-400 italic">(Opzionale)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PIATTI DEL GIORNO */}
      {activeTab === 'fuorimenu' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Piatti del Giorno / Fuori Menu</h2>
              <p className="text-xs text-slate-500">
                Piatti speciali visibili solo nei giorni specificati della settimana.
              </p>
            </div>
            <button
              onClick={() => setMostraFormPdg(!mostraFormPdg)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
            >
              {mostraFormPdg ? 'Chiudi' : '+ Aggiungi Fuori Menu'}
            </button>
          </div>

          {mostraFormPdg && (
            <form
              onSubmit={handleCreaPiattoDelGiorno}
              className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-4"
            >
              <h3 className="font-bold text-base text-slate-900">Nuovo Piatto del Giorno</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Piatto *
                  </label>
                  <input
                    type="text"
                    value={pdgNome}
                    onChange={(e) => setPdgNome(e.target.value)}
                    placeholder="es. Risotto ai Funghi Porcini"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prezzo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={pdgPrezzoEuro}
                    onChange={(e) => setPdgPrezzoEuro(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={pdgDesc}
                    onChange={(e) => setPdgDesc(e.target.value)}
                    placeholder="es. Funghi freschi locali, mantecato al parmigiano"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Giorni di disponibilità */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Giorni di Disponibilità nella Settimana
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {GIORNI_SETTIMANA.map((g) => {
                    const selezionato = pdgGiorni.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => {
                          if (selezionato) {
                            setPdgGiorni(pdgGiorni.filter((x) => x !== g.id));
                          } else {
                            setPdgGiorni([...pdgGiorni, g.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                          selezionato
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostraFormPdg(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {isPending ? 'Salvataggio…' : 'Salva Piatto del Giorno'}
                </button>
              </div>
            </form>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {initialPiattiDelGiorno.map((p) => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{p.nome}</h3>
                    {p.descrizione && (
                      <p className="text-xs text-slate-500 mt-0.5">{p.descrizione}</p>
                    )}
                    <span className="text-sm font-extrabold text-emerald-700 mt-1 inline-block">
                      {formatPrice(p.prezzo)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEliminaPiattoDelGiorno(p.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Elimina
                  </button>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Disponibile: </span>
                  {p.giorni_disponibilita
                    .map((g) => GIORNI_SETTIMANA.find((x) => x.id === g)?.label)
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
