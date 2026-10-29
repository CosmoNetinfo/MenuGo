import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFullLocaleBySlug } from '@/lib/queries/locale';
import { formatPrice, formatTimeItalian, ALLERGENI_UE } from '@/lib/formatters';
import { BRAND_CONFIG } from '@/config/brand';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getFullLocaleBySlug(params.slug);
  if (!data || data.locale.stato !== 'attivo') {
    return {
      title: 'Locale non trovato',
    };
  }

  const { branding } = data;
  return {
    title: `${branding.nome} · Vetrina Menu`,
    description: branding.slogan || `Consulta il menu e le specialità di ${branding.nome}`,
    manifest: `/${params.slug}/manifest.webmanifest`,
  };
}

export default async function LocaleShowcasePage({ params }: Props) {
  const data = await getFullLocaleBySlug(params.slug);

  if (!data) {
    notFound();
  }

  const { locale, branding, settings, categorie, destinazioni, zoneConsegna } = data;

  // Se il locale è sospeso dal super admin, mostra schermata di cortesia
  if (locale.stato === 'sospeso') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold mb-4">
          ⚠️
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{branding.nome}</h1>
        <p className="text-slate-600 max-w-md mb-6">
          Servizio temporaneamente non disponibile. Ci scusiamo per il disagio.
        </p>
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Torna a {BRAND_CONFIG.name}
        </Link>
      </div>
    );
  }

  // Variabili CSS dinamiche generate dai colori del locale
  const primaryColor = branding.colore_primario || '#059669';
  const accentColor = branding.colore_accento || '#ea580c';
  const primaryTextColor = branding.colore_testo_primario || '#ffffff';

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans"
      style={
        {
          '--primary': primaryColor,
          '--accent': accentColor,
          '--primary-text': primaryTextColor,
        } as React.CSSProperties
      }
    >
      {/* Top Banner / Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={branding.nome}
                className="h-10 w-auto max-w-[140px] object-contain rounded"
              />
            ) : (
              <div
                className="h-10 px-3 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm"
                style={{ backgroundColor: primaryColor, color: primaryTextColor }}
              >
                {branding.nome.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-lg text-slate-900 hidden sm:inline">
              {branding.nome}
            </span>
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
              href="/admin/aspetto"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 ml-2 px-2.5 py-1 rounded border border-slate-200 bg-white"
            >
              ⚙️ Gestore
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

      {/* Main Content (Menu Categories & Dishes) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Navigation Categories Pills */}
        {categorie.length > 0 && (
          <nav className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur py-3 -mx-4 px-4 mb-8 overflow-x-auto border-b border-slate-200 flex gap-2">
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
            <h2 className="text-lg font-semibold text-slate-800">Il menu è in fase di aggiornamento</h2>
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
                        Fasce: {dest.fasce.map((f) => `${formatTimeItalian(f.ora_inizio)}-${formatTimeItalian(f.ora_fine)}`).join(', ')}
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
                    <span className="font-semibold text-slate-800">{formatPrice(zona.costo)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      {/* Footer Vetrina */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-800 text-sm">{branding.nome}</p>
            {settings.indirizzo && <p>{settings.indirizzo}</p>}
            {settings.testo_privacy && <p className="mt-2 text-slate-400 max-w-md">{settings.testo_privacy}</p>}
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex gap-4">
              {settings.link_instagram && (
                <a href={settings.link_instagram} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
                  Instagram
                </a>
              )}
              {settings.link_facebook && (
                <a href={settings.link_facebook} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
                  Facebook
                </a>
              )}
              {settings.link_mappa && (
                <a href={settings.link_mappa} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
                  Mappa
                </a>
              )}
            </div>
            <p className="text-slate-400">
              Powered by{' '}
              <Link href="/" className="font-semibold text-slate-700 hover:underline">
                {BRAND_CONFIG.name}
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
