import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import ImpostazioniManager, { type LocaleSettingsData } from './ImpostazioniManager';

export const metadata = {
  title: 'Impostazioni Negozio — MenuGo Admin',
};

export default async function AdminImpostazioniPage() {
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
  const { data: settings } = await adminClient
    .from('locale_settings')
    .select('*')
    .eq('locale_id', utente.locale_id)
    .single();

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <ImpostazioniManager
          localeId={utente.locale_id}
          initialSettings={(settings || {}) as LocaleSettingsData}
        />
      </div>
    </div>
  );
}
