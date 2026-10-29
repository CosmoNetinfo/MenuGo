import { createClient } from '@/lib/supabase/server';
import { BRAND_CONFIG } from '@/config/brand';
import { logoutAction } from '@/lib/actions/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-50">
      {user && (
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-emerald-700">{BRAND_CONFIG.name}</span>
            <span className="hidden sm:block text-xs text-slate-400">Pannello Gestore</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
              >
                Esci
              </button>
            </form>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
