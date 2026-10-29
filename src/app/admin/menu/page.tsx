import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getFullLocaleBySlug } from '@/lib/queries/locale';
import MenuManager from './MenuManager';

export const metadata = {
  title: 'Gestione Menu & Piatti — MenuGo Admin',
};

export default async function AdminMenuPage() {
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

  if (!slug || !utente?.locale_id) {
    return (
      <div className="p-8 text-center text-slate-500">
        Nessun locale associato a questo account.
      </div>
    );
  }

  // Carica i dati del menu includendo anche gli elementi nascosti per il gestore
  const data = await getFullLocaleBySlug(slug, { includeNascosti: true });

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-500">
        Impossibile caricare il menu del locale.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 p-3 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <MenuManager
          localeId={utente.locale_id}
          localeSlug={slug}
          initialCategorie={data.categorie}
          initialMenuFissi={data.menuFissi}
          initialPiattiDelGiorno={data.piattiDelGiorno}
        />
      </div>
    </div>
  );
}
