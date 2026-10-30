import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import OrdiniManager, { type OrdineAdminItem } from './OrdiniManager';

export const metadata = {
  title: 'Gestione Ordini — MenuGo Admin',
};

export default async function AdminOrdiniPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: utente } = await supabase
    .from('utenti_locale')
    .select('locale_id')
    .eq('user_id', user.id)
    .single();

  if (!utente?.locale_id) {
    return <div className="p-8 text-center text-slate-500">Nessun locale associato.</div>;
  }

  const adminClient = createAdminClient();
  const { data: ordini } = await adminClient
    .from('ordini')
    .select('*, righe_ordine(*)')
    .eq('locale_id', utente.locale_id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <OrdiniManager
          localeId={utente.locale_id}
          initialOrdini={(ordini || []) as unknown as OrdineAdminItem[]}
        />
      </div>
    </div>
  );
}
