import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFullLocaleBySlug } from '@/lib/queries/locale';
import { BRAND_CONFIG } from '@/config/brand';
import { getGiornoSettimanaAttuale } from '@/lib/pricing';
import type { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
}

// 14 allergeni ufficiali UE (Regolamento UE 1169/2011)
const ALLERGENI_UE: Record<number, { nome: string; icona: string }> = {
  1: { nome: 'Glutine', icona: '🌾' },
  2: { nome: 'Crostacei', icona: '🦐' },
  3: { nome: 'Uova', icona: '🥚' },
  4: { nome: 'Pesce', icona: '🐟' },
  5: { nome: 'Arachidi', icona: '🥜' },
  6: { nome: 'Soia', icona: '🌱' },
  7: { nome: 'Latte e lattosio', icona: '🥛' },
  8: { nome: 'Frutta a guscio', icona: '🌰' },
  9: { nome: 'Sedano', icona: '🥬' },
  10: { nome: 'Senape', icona: '🟡' },
  11: { nome: 'Sesamo', icona: '⚪' },
  12: { nome: 'Solfiti', icona: '🍷' },
  13: { nome: 'Lupini', icona: '🌿' },
  14: { nome: 'Molluschi', icona: '🦪' },
};

function formatPrice(cents: number): string {
  const euro = (cents / 100).toFixed(2).replace('.', ',');
  return `${euro} €`;
}

function formatTimeItalian(timeStr: string): string {
  const parts = timeStr.split(':');
  return `${parts[0]}:${parts[1]}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getFullLocaleBySlug(params.slug);
  if (!data) return {};

  const { branding, locale } = data;
  return {
    title: `${branding.nome} — Vetrina Online MenuGo`,
    description: branding.slogan || `Consulta il menu e ordina online da ${branding.nome}.`,
    manifest: `/${locale.slug}/manifest.webmanifest`,
    icons: branding.logo_url ? [{ url: branding.logo_url }] : [],
    themeColor: branding.colore_primario,
  };
}

export default async function LocaleShowcasePage({ params }: PageProps) {
  const data = await getFullLocaleBySlug(params.slug);

  if (!data) {
    notFound();
  }

  const { branding, settings, categorie, menuFissi, piattiDelGiorno, destinazioni, zoneConsegna } = data;

  // Stile dinamico basato sui colori del locale
  const primaryColor = branding.colore_primario || '#059669';
  const accentColor = branding.colore_accento || '#ea580c';
  const primaryTextColor = branding.colore_testo_primario || '#ffffff';

  // Piatto del giorno disponibile oggi
  const giornoOggi = getGiornoSettimanaAttuale();
  const piattiOggi = piattiDelGiorno.filter(
    (p) => p.attivo && p.giorni_disponibilita.includes(giornoOggi)
  );

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 text-slate-800"
      style={
        {
          '--color-primary': primaryColor,
          '--color-accent': accentColor,
          '--color-primary-text': primaryTextColor,
        } as React.CSSProperties
      }
    >
      {/* Header Vetrina */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={branding.nome}
                className="h-10 w-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg shadow-xs"
                style={{ backgroundColor: primaryColor, color: primaryTextColor }}
              >
                {branding.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 block truncate max-w-[200px] sm:max-w-none">
                {branding.nome}
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Menu online su {BRAND_CONFIG.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {settings.modalita === 'solo_vetrina' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <span>📖</span> Solo consultazione
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border shadow-xs"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  borderColor: `${primaryColor}40`,
                  color: primaryColor,
                }}
              >
                <span>🛒</span> Ordini attivi
              </span>
            )}

            <Link
              href="/admin/menu"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 ml-2 px-2.5 py-1 rounded border border-slate-200 bg-white"
            >
              ⚙️ Menu Gestore
            </Link>
          </div>
        </div>
      </header>

      {/* Hero / Cover Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        {branding.copertina_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.copertina_url}
            alt="Copertina"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
        )}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}dd 0%, #0f172add 100%)`,
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3">
              {branding.nome}
            </h1>
            {branding.slogan && (
              <p className="text-lg sm:text-xl font-medium text-slate-200 mb-4">
                {branding.slogan}
              </p>
            )}
            {branding.messaggio_benvenuto && (
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed bg-black/20 backdrop-blur p-4 rounded-xl border border-white/10">
                {branding.messaggio_benvenuto}
              </p>
            )}

            {/* Quick Contact Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              {settings.indirizzo && (
                <div className="flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{settings.indirizzo}</span>
                </div>
              )}
              {settings.telefono && (
                <a
                  href={`tel:${settings.telefono}`}
                  className="flex items-center gap-1.5 hover:text-white underline underline-offset-2"
                >
                  <span>📞</span>
                  <span>{settings.telefono}</span>
                </a>
              )}
              {settings.orario_limite_ordini && settings.modalita === 'vetrina_ordini' && (
                <div className="flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>
                    Ordini entro le {formatTimeItalian(settings.orario_limite_ordini)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-10">
        {/* Sezione Fuori Menu / Piatti del Giorno */}
        {piattiOggi.length > 0 && (
          <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-5 rounded-3xl border border-amber-200">
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
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-1">
                      Oggi
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{pdg.nome}</h3>
                    {pdg.descrizione && (
                      <p className="text-xs text-slate-500 mt-1">{pdg.descrizione}</p>
                    )}
                    <span className="text-sm font-extrabold text-slate-900 mt-2 block">
                      {formatPrice(pdg.prezzo)}
                    </span>
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

        {/* Sezione Menu Fissi & Formule */}
        {menuFissi.length > 0 && (
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⭐</span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Formule &amp; Menu Fissi
                </h2>
                <p className="text-xs text-slate-500">
                  Combinazioni complete a prezzo bloccato
                </p>
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Navigation Categories Pills */}
        {categorie.length > 0 && (
          <nav className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur py-3 -mx-4 px-4 overflow-x-auto border-b border-slate-200 flex gap-2">
            {categorie.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-slate-400 transition shadow-xs"
              >
                {cat.nome} ({cat.prodotti.length})
              </a>
            ))}
          </nav>
        )}

        {/* Categories and Products List */}
        {categorie.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <span className="text-4xl block mb-2">🍽️</span>
            <h2 className="text-lg font-semibold text-slate-800">
              Il menu è in fase di aggiornamento
            </h2>
            <p className="text-sm text-slate-500">I piatti del locale saranno presto visibili online.</p>
          </div>
        ) : (
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
                        {/* Foto o segnaposto elegante */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 relative">
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

                        {/* Dettagli piatto */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-base leading-snug mb-1">
                            {piatto.nome}
                          </h3>
                          {piatto.descrizione && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">
                              {piatto.descrizione}
                            </p>
                          )}

                          {/* Allergeni */}
                          {piatto.allergeni && piatto.allergeni.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {piatto.allergeni.map((num) => {
                                const allergene = ALLERGENI_UE[num];
                                if (!allergene) return null;
                                return (
                                  <span
                                    key={num}
                                    title={allergene.nome}
                                    className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                  >
                                    {allergene.icona} {num}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Gruppi di opzioni/varianti disponibili */}
                          {piatto.gruppiOpzioni && piatto.gruppiOpzioni.length > 0 && (
                            <div className="mt-1 text-[11px] text-slate-400">
                              Varianti:{' '}
                              {piatto.gruppiOpzioni
                                .map(
                                  (g) =>
                                    `${g.nome} (${g.opzioni
                                      .map((o) => (o.prezzo_extra > 0 ? `${o.nome} +${formatPrice(o.prezzo_extra)}` : o.nome))
                                      .join(', ')})`
                                )
                                .join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Barra inferiore: Prezzo e Azione */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-base font-extrabold text-slate-900">
                          {formatPrice(piatto.prezzo)}
                        </span>

                        {settings.modalita === 'vetrina_ordini' ? (
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
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
        )}

        {/* Informazioni aggiuntive: Consegne e Ritiro */}
        <section className="mt-16 pt-8 border-t border-slate-200 grid sm:grid-cols-2 gap-6">
          {destinazioni.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>🏢</span> Punti di consegna programmata
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                {destinazioni.map((dest) => (
                  <li key={dest.id} className="border-b border-slate-100 pb-2 last:border-none">
                    <p className="font-semibold text-slate-800">{dest.nome}</p>
                    {dest.indirizzo && <p className="text-slate-400">{dest.indirizzo}</p>}
                    {dest.fasce.length > 0 && (
                      <p className="text-emerald-700 mt-1 font-medium">
                        Fasce:{' '}
                        {dest.fasce
                          .map((f) => `${formatTimeItalian(f.ora_inizio)}-${formatTimeItalian(f.ora_fine)}`)
                          .join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {zoneConsegna.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>🛵</span> Consegna a domicilio
              </h3>
              <ul className="space-y-2 text-xs text-slate-600">
                {zoneConsegna.map((zona) => (
                  <li key={zona.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-none">
                    <span>{zona.nome}</span>
                    <span className="font-semibold text-slate-800">
                      {zona.costo === 0 ? 'Gratis' : formatPrice(zona.costo)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          <p>
            © {new Date().getFullYear()} {branding.nome}. Tutti i diritti riservati.
          </p>
          <p className="text-[11px] text-slate-400">
            Piattaforma e tecnologia di {BRAND_CONFIG.name} · Ordini veloci senza registrazione
          </p>
        </div>
      </footer>
    </div>
  );
}
