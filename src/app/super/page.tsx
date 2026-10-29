import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BRAND_CONFIG } from '@/config/brand';
import { logoutAction } from '@/lib/actions/auth';

export const metadata = {
  title: 'Pannello Super Amministratore — MenuGo',
};

export default async function SuperDashboardPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/super/login');

  // Carica lista locali
  const { data: locali } = await supabase
    .from('locali')
    .select('id, slug, stato, piano')
    .order('created_at', { ascending: false });

  // Carica lista gestori (utenti_locale + auth info non disponibile lato client)
  const { data: gestori } = await supabase
    .from('utenti_locale')
    .select('user_id, locale_id, ruolo, locali(slug)');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {BRAND_CONFIG.name}
          </span>
          <h1 className="text-lg font-extrabold text-white">Super Amministratore</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{session.user.email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white transition"
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        {/* Riepilogo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <p className="text-3xl font-extrabold text-emerald-400">{locali?.length ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1">Locali totali</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <p className="text-3xl font-extrabold text-sky-400">
              {locali?.filter((l) => l.stato === 'attivo').length ?? 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">Attivi</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <p className="text-3xl font-extrabold text-amber-400">{gestori?.length ?? 0}</p>
            <p className="text-xs text-slate-400 mt-1">Gestori</p>
          </div>
        </div>

        {/* Tabella locali */}
        <section>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3">
            Locali registrati
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-left">Stato</th>
                  <th className="px-4 py-3 text-left">Piano</th>
                  <th className="px-4 py-3 text-left">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(locali ?? []).map((locale) => (
                  <tr key={locale.id} className="bg-slate-900 hover:bg-slate-800 transition">
                    <td className="px-4 py-3 font-mono text-slate-200">{locale.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          locale.stato === 'attivo'
                            ? 'bg-emerald-900 text-emerald-300'
                            : locale.stato === 'sospeso'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {locale.stato}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{locale.piano}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale.slug}`}
                        target="_blank"
                        className="text-xs text-sky-400 hover:text-sky-300 transition"
                      >
                        Vetrina →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
