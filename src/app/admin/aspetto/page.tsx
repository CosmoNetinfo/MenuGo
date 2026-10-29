import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getFullLocaleBySlug } from '@/lib/queries/locale';
import AspettoForm from './AspettoForm';

export const metadata = {
  title: 'Personalizzazione Aspetto e Vetrina — MenuGo Admin',
};

export default async function AdminAspettoPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/admin/login');

  // Recupera il locale dell'utente loggato
  const { data: utente, error } = await supabase
    .from('utenti_locale')
    .select('locale_id, locali(slug)')
    .eq('user_id', session.user.id)
    .single();

  if (error || !utente) {
    return (
      <div className="p-8 text-center text-slate-500">
        Nessun locale associato al tuo account. Contatta il supporto {BRAND_CONFIG_NAME}.
      </div>
    );
  }

  // locali è un oggetto singolo perché è una FK a una singola riga
  const localeRel = utente.locali as unknown as { slug: string } | null;
  const slug = localeRel?.slug;

  if (!slug) {
    return (
      <div className="p-8 text-center text-slate-500">
        Locale non trovato. Contatta il supporto.
      </div>
    );
  }

  const data = await getFullLocaleBySlug(slug);

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-500">
        Impossibile caricare i dati del locale. Riprova più tardi.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 sm:p-8">
      <AspettoForm
        locale={data.locale}
        initialBranding={data.branding}
        initialSettings={data.settings}
      />
    </div>
  );
}

// Costante usata nei messaggi di errore (non import per evitare dipendenza circolare)
const BRAND_CONFIG_NAME = 'MenuGo';
