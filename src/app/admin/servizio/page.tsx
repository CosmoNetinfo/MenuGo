import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import ServizioManager from './ServizioManager';

export const metadata = {
  title: 'Servizio & Zone di Consegna — MenuGo Admin',
};

export default async function AdminServizioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: utente } = await supabase
    .from('utenti_locale')
    .select('locale_id')
    .eq('user_id', user.id)
    .single();

  if (!utente?.locale_id) redirect('/admin/login');

  const adminClient = createAdminClient();

  const { data: settings } = await adminClient
    .from('locale_settings')
    .select('modalita')
    .eq('locale_id', utente.locale_id)
    .single();

  const { data: zone } = await adminClient
    .from('zone_consegna')
    .select('*')
    .eq('locale_id', utente.locale_id)
    .order('ordine', { ascending: true });

  const { data: destinazioni } = await adminClient
    .from('destinazioni')
    .select('*')
    .eq('locale_id', utente.locale_id)
    .order('ordine', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <ServizioManager
          localeId={utente.locale_id}
          modalitaAttuale={settings?.modalita || 'vetrina_ordini'}
          initialZone={zone || []}
          initialDestinazioni={destinazioni || []}
        />
      </div>
    </div>
  );
}
