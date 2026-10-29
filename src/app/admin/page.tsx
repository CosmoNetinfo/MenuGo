import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BRAND_CONFIG } from '@/config/brand';
import { getFullLocaleBySlug } from '@/lib/queries/locale';

export const metadata = {
  title: 'Pannello di Controllo — MenuGo',
};

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  // Recupera il locale dell'utente loggato
  const { data: utente } = await supabase
    .from('utenti_locale')
    .select('locale_id, locali(slug)')
    .eq('user_id', user.id)
    .single();

  const localeRel = utente?.locali as unknown as { slug: string } | null;
  const slug = localeRel?.slug;

  const data = slug ? await getFullLocaleBySlug(slug) : null;
  const nomeLocale = data?.branding.nome || 'Il tuo locale';

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {BRAND_CONFIG.name} · Pannello Gestore
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {nomeLocale}
            </h1>
          </div>

          {slug && (
            <div className="flex items-center gap-3">
              <Link
                href={`/${slug}`}
                target="_blank"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                🌐 Vedi vetrina online
              </Link>
            </div>
          )}
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/aspetto"
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 transition shadow-sm group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-105 transition">
              🎨
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
              Vetrina e Aspetto
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Personalizza nome, logo, colori, copertina e testi del tuo locale.
            </p>
          </Link>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 opacity-60">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg mb-4">
              🍽️
            </div>
            <h2 className="text-base font-bold text-slate-900">Menu &amp; Piatti</h2>
            <p className="text-xs text-slate-500 mt-1">
              Gestione categorie, varianti e allergeni (Fase 3).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 opacity-60">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg mb-4">
              📋
            </div>
            <h2 className="text-base font-bold text-slate-900">Ordini Ricevuti</h2>
            <p className="text-xs text-slate-500 mt-1">
              Dashboard ordini, porzioni da preparare e incassi (Fase 5).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
