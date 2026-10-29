import Link from "next/link";
import { BRAND_CONFIG } from "@/config/brand";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              M
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              {BRAND_CONFIG.name}
            </span>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/trattoria-demo"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-block"
            >
              Vetrina demo
            </Link>
            <Link
              href="/admin"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              Pannello Gestore
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1">
        <section className="py-20 sm:py-28 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
            <span>✨ Novità</span>
            <span className="text-slate-400">•</span>
            <span>Web app PWA multi-locale</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight mb-6">
            La vetrina e gli ordini online per il tuo locale.
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Ogni ristorante ottiene la propria vetrina online con nome, logo, colori,
            menu e ordini. Tutto modificabile in autonomia senza saper programmare.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/trattoria-demo"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm hover:shadow"
            >
              Esplora la Vetrina Demo
            </Link>
            <Link
              href="/admin"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition shadow-sm"
            >
              Accedi al Pannello
            </Link>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Due modalità per ogni esigenza
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Attivabili con un semplice interruttore dal pannello di controllo.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Solo Vetrina</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  Il menu è visibile online con foto, allergeni, orari e prezzi aggiornati. Ideale per chi desidera mostrare la propria offerta senza gestire ordini online.
                </p>
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  Consultazione digitale immediata
                </span>
              </div>

              <div className="p-8 rounded-2xl border border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 transition">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Vetrina + Ordini</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  I clienti ordinano direttamente dalla vetrina con calcolo automatico dei totali lato server, orario limite configurabile e scelta tra ritiro o consegna.
                </p>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Ordini e incassi veloci
                </span>
              </div>
            </div>

            {/* Core Values */}
            <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12 pt-8 border-t border-slate-100">
              <div className="text-center sm:text-left">
                <h4 className="font-semibold text-slate-900 mb-1">Personalizzazione totale</h4>
                <p className="text-xs text-slate-500">Logo, banner, colori primari e d&apos;accento con controllo contrasto testo.</p>
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-semibold text-slate-900 mb-1">Massima sicurezza RLS</h4>
                <p className="text-xs text-slate-500">Isolamento rigoroso dei dati multi-tenant con Supabase Row Level Security.</p>
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-semibold text-slate-900 mb-1">PWA Installabile</h4>
                <p className="text-xs text-slate-500">Manifest dinamico per singolo locale, icone personalizzate e funzionamento offline parziale.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4 sm:px-6 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {BRAND_CONFIG.name}. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span>Fuso: {BRAND_CONFIG.timeZone}</span>
            <span>Versione {BRAND_CONFIG.version}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
