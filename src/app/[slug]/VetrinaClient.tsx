'use client';

import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/formatters';
import type { CartItem, CartItemOpzione, CartItemProdotto, CartItemMenuFisso, CartItemPiattoDelGiorno } from '@/lib/pricing';
import CartDrawer, { type AvailabilityData } from '@/components/cart/CartDrawer';
import type { FullLocaleData, ProdottoConOpzioni, MenuFissoConSlot } from '@/lib/queries/locale';
import type { Database } from '@/types/database';

type PiattoDelGiorno = Database['public']['Tables']['piatti_del_giorno']['Row'];

interface VetrinaClientProps {
  data: FullLocaleData;
  piattiOggi: PiattoDelGiorno[];
}

export default function VetrinaClient({ data, piattiOggi }: VetrinaClientProps) {
  const { locale, branding, settings, categorie, menuFissi } = data;

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);

  // Modal per selezione opzioni piatto
  const [prodottoInConfigurazione, setProdottoInConfigurazione] = useState<ProdottoConOpzioni | null>(null);
  const [opzioniSelezionate, setOpzioniSelezionate] = useState<CartItemOpzione[]>([]);

  // Modal per composizione menu fisso
  const [menuFisInConfigurazione, setMenuFisInConfigurazione] = useState<MenuFissoConSlot | null>(null);
  const [scelteSlot, setScelteSlot] = useState<Record<string, { prodottoId: string; nomeProdotto: string }>>({});

  const primaryColor = branding.colore_primario || '#059669';
  const accentColor = branding.colore_accento || '#ea580c';
  const primaryTextColor = branding.colore_testo_primario || '#ffffff';

  // Carica disponibilità dinamica
  useEffect(() => {
    if (settings.modalita === 'vetrina_ordini') {
      fetch(`/api/availability?slug=${locale.slug}`)
        .then((r) => r.json())
        .then((d) => setAvailability(d))
        .catch(() => {});
    }
  }, [locale.slug, settings.modalita]);

  const totaleArticoli = cartItems.reduce((acc, it) => acc + it.quantita, 0);

  // Aggiunta piatto standard
  function handleAddProdotto(p: ProdottoConOpzioni) {
    if (p.gruppiOpzioni && p.gruppiOpzioni.length > 0) {
      setProdottoInConfigurazione(p);
      setOpzioniSelezionate([]);
      return;
    }

    const item: CartItemProdotto = {
      tipo: 'prodotto',
      prodottoId: p.id,
      nome: p.nome,
      prezzoUnitarioCentesimi: p.prezzo,
      quantita: 1,
    };

    setCartItems((prev) => {
      const existing = prev.findIndex((it) => it.tipo === 'prodotto' && it.prodottoId === p.id);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing].quantita += 1;
        return copy;
      }
      return [...prev, item];
    });
  }

  function handleConfermaOpzioniProdotto() {
    if (!prodottoInConfigurazione) return;

    const item: CartItemProdotto = {
      tipo: 'prodotto',
      prodottoId: prodottoInConfigurazione.id,
      nome: prodottoInConfigurazione.nome,
      prezzoUnitarioCentesimi: prodottoInConfigurazione.prezzo,
      quantita: 1,
      opzioni: opzioniSelezionate,
    };

    setCartItems((prev) => [...prev, item]);
    setProdottoInConfigurazione(null);
  }

  // Aggiunta piatto del giorno
  function handleAddPiattoDelGiorno(pdg: PiattoDelGiorno) {
    const item: CartItemPiattoDelGiorno = {
      tipo: 'piatto_del_giorno',
      piattoId: pdg.id,
      nome: pdg.nome,
      prezzoUnitarioCentesimi: pdg.prezzo,
      quantita: 1,
      giorniDisponibilita: pdg.giorni_disponibilita,
    };

    setCartItems((prev) => {
      const existing = prev.findIndex((it) => it.tipo === 'piatto_del_giorno' && it.piattoId === pdg.id);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing].quantita += 1;
        return copy;
      }
      return [...prev, item];
    });
  }

  // Composizione Menu Fisso
  function handleStartMenuFisso(mf: MenuFissoConSlot) {
    setMenuFisInConfigurazione(mf);
    setScelteSlot({});
  }

  function handleConfermaMenuFisso() {
    if (!menuFisInConfigurazione) return;

    const scelte = menuFisInConfigurazione.slots.map((s) => ({
      slotId: s.id,
      nomeSlot: s.nome,
      prodottoId: scelteSlot[s.id]?.prodottoId,
      nomeProdotto: scelteSlot[s.id]?.nomeProdotto,
    }));

    const item: CartItemMenuFisso = {
      tipo: 'menu_fisso',
      menuFissoId: menuFisInConfigurazione.id,
      nome: menuFisInConfigurazione.nome,
      prezzoFissoCentesimi: menuFisInConfigurazione.prezzo,
      quantita: 1,
      scelteSlot: scelte,
    };

    setCartItems((prev) => [...prev, item]);
    setMenuFisInConfigurazione(null);
  }

  function handleUpdateQuantity(index: number, newQty: number) {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCartItems((prev) => {
      const copy = [...prev];
      copy[index].quantita = newQty;
      return copy;
    });
  }

  function handleRemoveItem(index: number) {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  }

  const isSoloVetrina = settings.modalita === 'solo_vetrina';

  return (
    <>
      {/* Fuori Menu del Giorno */}
      {piattiOggi.length > 0 && (
        <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-5 rounded-3xl border border-amber-200 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🌟</span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Fuori Menu del Giorno
              </h2>
              <p className="text-xs text-slate-500">Specialità fresche disponibili solo oggi</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {piattiOggi.map((pdg) => (
              <div
                key={pdg.id}
                className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex justify-between gap-4"
              >
                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-1">
                    Oggi
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{pdg.nome}</h3>
                  {pdg.descrizione && (
                    <p className="text-xs text-slate-500 mt-1">{pdg.descrizione}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatPrice(pdg.prezzo)}
                    </span>
                    {!isSoloVetrina && (
                      <button
                        onClick={() => handleAddPiattoDelGiorno(pdg)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                      >
                        + Aggiungi
                      </button>
                    )}
                  </div>
                </div>
                {pdg.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pdg.foto_url}
                    alt={pdg.nome}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Menu Fissi */}
      {menuFissi.length > 0 && (
        <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⭐</span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Formule &amp; Menu Fissi
              </h2>
              <p className="text-xs text-slate-500">Combinazioni complete a prezzo bloccato</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {menuFissi.map((mf) => (
              <div
                key={mf.id}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{mf.nome}</h3>
                    <span className="text-base font-extrabold text-emerald-700">
                      {formatPrice(mf.prezzo)}
                    </span>
                  </div>
                  {mf.descrizione && (
                    <p className="text-xs text-slate-500 mt-1">{mf.descrizione}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-xs text-slate-600">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Include a scelta:
                    </span>
                    {mf.slots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span>• {s.nome}</span>
                        {s.facoltativo && (
                          <span className="text-[10px] text-slate-400 italic">Opzionale</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {!isSoloVetrina && (
                  <button
                    onClick={() => handleStartMenuFisso(mf)}
                    className="mt-4 w-full py-2 rounded-xl text-xs font-bold text-white shadow-xs transition hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Componi Menu ({formatPrice(mf.prezzo)})
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categorie e Piatti */}
      <div className="space-y-12">
        {categorie.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
            <div className="border-b border-slate-200 pb-3 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{cat.nome}</h2>
              {cat.descrizione && (
                <p className="text-sm text-slate-500 mt-1">{cat.descrizione}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {cat.prodotti.map((piatto) => (
                <article
                  key={piatto.id}
                  className="flex flex-col justify-between bg-white rounded-2xl p-4 border border-slate-200 hover:border-slate-300 transition shadow-xs hover:shadow"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 relative">
                      {piatto.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={piatto.foto_url}
                          alt={piatto.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                          <span className="text-2xl">🍲</span>
                          <span className="text-[10px] text-slate-400 mt-1 font-medium">MenuGo</span>
                        </div>
                      )}

                      {piatto.in_evidenza && (
                        <span
                          className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          SPECIALITÀ
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-base leading-snug mb-1">
                        {piatto.nome}
                      </h3>
                      {piatto.descrizione && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">
                          {piatto.descrizione}
                        </p>
                      )}

                      {piatto.gruppiOpzioni && piatto.gruppiOpzioni.length > 0 && (
                        <div className="mt-1 text-[11px] text-slate-400">
                          Varianti disponibili
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-base font-extrabold text-slate-900">
                      {formatPrice(piatto.prezzo)}
                    </span>

                    {!isSoloVetrina ? (
                      <button
                        type="button"
                        onClick={() => handleAddProdotto(piatto)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition hover:opacity-90"
                        style={{
                          backgroundColor: primaryColor,
                          color: primaryTextColor,
                        }}
                      >
                        + Aggiungi
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        Disponibile in locale
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Floating Cart Button (Mobile & Desktop) */}
      {!isSoloVetrina && totaleArticoli > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in slide-in-from-bottom duration-200">
          <button
            onClick={() => setIsCartOpen(true)}
            className="px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm hover:scale-105 active:scale-95 transition"
            style={{
              backgroundColor: primaryColor,
              color: primaryTextColor,
            }}
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {totaleArticoli}
            </span>
            <span>Vedi Ordine</span>
            <span>🛒</span>
          </button>
        </div>
      )}

      {/* Modal Configurazione Varianti Piatto */}
      {prodottoInConfigurazione && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{prodottoInConfigurazione.nome}</h3>
              <p className="text-xs text-slate-500">Personalizza il tuo piatto prima di aggiungerlo</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {prodottoInConfigurazione.gruppiOpzioni?.map((gr) => (
                <div key={gr.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>{gr.nome}</span>
                    {gr.obbligatorio && (
                      <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        Obbligatorio
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {gr.opzioni.map((opz) => {
                      const selezionata = opzioniSelezionate.some((o) => o.opzioneId === opz.id);
                      return (
                        <label
                          key={opz.id}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type={gr.scelta_multipla ? 'checkbox' : 'radio'}
                              name={`gruppo_${gr.id}`}
                              checked={selezionata}
                              onChange={() => {
                                if (gr.scelta_multipla) {
                                  if (selezionata) {
                                    setOpzioniSelezionate(opzioniSelezionate.filter((o) => o.opzioneId !== opz.id));
                                  } else {
                                    setOpzioniSelezionate([
                                      ...opzioniSelezionate,
                                      { opzioneId: opz.id, nome: opz.nome, prezzoExtraCentesimi: opz.prezzo_extra },
                                    ]);
                                  }
                                } else {
                                  // Singola
                                  const altre = opzioniSelezionate.filter((o) => !gr.opzioni.some((x) => x.id === o.opzioneId));
                                  setOpzioniSelezionate([
                                    ...altre,
                                    { opzioneId: opz.id, nome: opz.nome, prezzoExtraCentesimi: opz.prezzo_extra },
                                  ]);
                                }
                              }}
                              className="text-emerald-600"
                            />
                            <span>{opz.nome}</span>
                          </div>
                          {opz.prezzo_extra > 0 && (
                            <span className="font-semibold text-emerald-700">
                              +{formatPrice(opz.prezzo_extra)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProdottoInConfigurazione(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfermaOpzioniProdotto}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Aggiungi al Carrello
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Composizione Menu Fisso */}
      {menuFisInConfigurazione && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{menuFisInConfigurazione.nome}</h3>
              <p className="text-xs text-slate-500">Scegli i piatti per ciascuna portata inclusa</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {menuFisInConfigurazione.slots.map((slot) => {
                // Filtra piatti ammissibili
                const piattiSlot = slot.categoria_id
                  ? categorie.find((c) => c.id === slot.categoria_id)?.prodotti || []
                  : categorie.flatMap((c) => c.prodotti);

                return (
                  <div key={slot.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>{slot.nome}</span>
                      {slot.facoltativo && (
                        <span className="text-[10px] text-slate-400 font-normal italic">Opzionale</span>
                      )}
                    </span>
                    <select
                      value={scelteSlot[slot.id]?.prodottoId || ''}
                      onChange={(e) => {
                        const scelto = piattiSlot.find((p) => p.id === e.target.value);
                        if (scelto) {
                          setScelteSlot({
                            ...scelteSlot,
                            [slot.id]: { prodottoId: scelto.id, nomeProdotto: scelto.nome },
                          });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="">-- Seleziona {slot.nome} --</option>
                      {piattiSlot.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMenuFisInConfigurazione(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfermaMenuFisso}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Conferma Formula ({formatPrice(menuFisInConfigurazione.prezzo)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Component */}
      <CartDrawer
        slug={locale.slug}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        availability={availability}
        primaryColor={primaryColor}
        primaryTextColor={primaryTextColor}
      />
    </>
  );
}
