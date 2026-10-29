import { getFullLocaleBySlug } from '@/lib/queries/locale';
import AspettoForm from './AspettoForm';

export const metadata = {
  title: 'Personalizzazione Aspetto e Vetrina · MenuGo Admin',
};

export default async function AdminAspettoPage() {
  // Carica i dati del locale demo (slug: trattoria-demo)
  const data = await getFullLocaleBySlug('trattoria-demo');

  if (!data) {
    return (
      <div className="p-8 text-center text-slate-500">
        Nessun locale configurato trovato. Assicurati che il seed sia stato eseguito.
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
