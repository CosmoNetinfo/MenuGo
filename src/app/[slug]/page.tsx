import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFullLocaleBySlug } from '@/lib/queries/locale';
import { BRAND_CONFIG } from '@/config/brand';
import { getGiornoSettimanaAttuale } from '@/lib/pricing';
import { formatTimeItalian } from '@/lib/formatters';
import VetrinaClient from './VetrinaClient';
import type { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
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

  const { branding, settings, categorie, piattiDelGiorno, destinazioni, zoneConsegna, locale } = data;

  const primaryColor = branding.colore_primario || '#059669';
  const accentColor = branding.colore_accento || '#ea580c';
  const primaryTextColor = branding.colore_testo_primario || '#ffffff';

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
            <Link
              href={`/${locale.slug}/miei-ordini`}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full border border-slate-200 bg-white shadow-xs"
            >
              📋 I Miei Ordini
            </Link>

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

      {/* Main Content (Vetrina interattiva con carrello) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Navigation Categories Pills */}
        {categorie.length > 0 && (
          <nav className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur py-3 -mx-4 px-4 overflow-x-auto border-b border-slate-200 flex gap-2 mb-8">
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

        <VetrinaClient data={data} piattiOggi={piattiOggi} />

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
                      {zona.costo === 0 ? 'Gratis' : `${(zona.costo / 100).toFixed(2).replace('.', ',')} €`}
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
          <div className="flex justify-center gap-4 text-[11px] text-slate-400">
            <Link href={`/${locale.slug}/privacy`} className="hover:underline">
              Informativa sulla Privacy
            </Link>
            <span>·</span>
            <span>Tecnologia {BRAND_CONFIG.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
