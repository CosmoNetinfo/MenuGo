import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { BRAND_CONFIG } from '@/config/brand';
import { logoutAction } from '@/lib/actions/auth';
import SuperDashboardClient, { type SuperLocaleItem } from './SuperDashboardClient';

export const metadata = {
  title: 'Pannello Super Amministratore — MenuGo',
};

export default async function SuperDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/super/login');

  // Verifica che l'utente sia super admin
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
    check_user_id: user.id,
  });

  if (!isSuperAdmin) redirect('/admin');

  const adminClient = createAdminClient();

  // Carica lista locali con branding
  const { data: locali } = await adminClient
    .from('locali')
    .select('id, slug, stato, piano, created_at, locale_branding(nome)')
    .order('created_at', { ascending: false });

  // Carica ordini per aggregare statistiche (conteggio e fatturato)
  const { data: ordini } = await adminClient
    .from('ordini')
    .select('locale_id, totale_centesimi, stato');

  // Carica lista utenti_locale
  const { data: utentiLocale } = await adminClient
    .from('utenti_locale')
    .select('locale_id, user_id, ruolo');

  // Carica lista utenti auth
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  }

  // Costruisci gli item arricchiti
  const localiItems: SuperLocaleItem[] = (locali || []).map((loc) => {
    const branding = Array.isArray(loc.locale_branding)
      ? loc.locale_branding[0]
      : loc.locale_branding;

    const ordiniDelLocale = (ordini || []).filter((o) => o.locale_id === loc.id);
    const ordiniCount = ordiniDelLocale.length;
    // Solo gli ordini non annullati contano nel fatturato
    const fatturatoTotale = ordiniDelLocale
      .filter((o) => o.stato !== 'annullato')
      .reduce((acc, o) => acc + (o.totale_centesimi || 0), 0);

    const gestoriIds = (utentiLocale || [])
      .filter((ul) => ul.locale_id === loc.id)
      .map((ul) => ul.user_id);

    const gestoriEmails = gestoriIds
      .map((id) => emailMap.get(id))
      .filter((email): email is string => Boolean(email));

    return {
      id: loc.id,
      slug: loc.slug,
      stato: loc.stato as 'attivo' | 'sospeso',
      piano: loc.piano,
      created_at: loc.created_at,
      branding: branding ? { nome: branding.nome } : null,
      ordiniCount,
      fatturatoTotale,
      gestori: gestoriEmails,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      {/* Header Super Admin */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {BRAND_CONFIG.name} · Piattaforma Multi-Tenant
          </span>
          <h1 className="text-lg font-extrabold text-white">Super Amministratore</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{user.email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700"
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-8">
        <SuperDashboardClient initialLocali={localiItems} />
      </main>
    </div>
  );
}
