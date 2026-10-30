import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import CalendarioManager from './CalendarioManager';

export const metadata = {
  title: 'Calendario & Chiusure — MenuGo Admin',
};

export default async function AdminCalendarioPage() {
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
  const { data: eccezioni } = await adminClient
    .from('calendario_giorni')
    .select('*')
    .eq('locale_id', utente.locale_id)
    .order('giorno', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <CalendarioManager
          localeId={utente.locale_id}
          initialEccezioni={eccezioni || []}
        />
      </div>
    </div>
  );
}
