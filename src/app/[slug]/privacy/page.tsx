import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getFullLocaleBySlug } from '@/lib/queries/locale';
import { BRAND_CONFIG } from '@/config/brand';
import type { Metadata } from 'next';

interface PageProps {
  params: { slug: string };
}

export const metadata: Metadata = {
  title: 'Informativa Privacy — MenuGo',
};

export default async function PrivacyLocalePage({ params }: PageProps) {
  const data = await getFullLocaleBySlug(params.slug);

  if (!data) notFound();

  const { branding, settings } = data;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-8 flex justify-center">
      <div className="max-w-2xl w-full bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-slate-800">
        <div>
          <Link
            href={`/${params.slug}`}
            className="text-xs font-semibold text-emerald-700 hover:underline mb-3 block"
          >
            ← Torna al menu di {branding.nome}
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Informativa sulla Privacy</h1>
          <p className="text-xs text-slate-400 mt-1">
            Trattamento dei dati personali per l&apos;inoltro e la gestione degli ordini
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="font-bold text-slate-900 text-sm mb-1">1. Titolare del Trattamento</h2>
            <p>
              Il titolare del trattamento dei dati è <strong>{branding.nome}</strong>
              {settings.indirizzo ? `, con sede in ${settings.indirizzo}` : ''}
              {settings.telefono ? ` (Tel: ${settings.telefono})` : ''}
              {settings.email ? ` (Email: ${settings.email})` : ''}.
              La piattaforma software <strong>{BRAND_CONFIG.name}</strong> opera come responsabile tecnico del trattamento.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-sm mb-1">2. Dati Raccolti e Finalità</h2>
            <p>
              I dati personali richiesti in fase di ordine (<strong>Nome, Cognome, Numero di telefono, Indirizzo di consegna</strong> e <strong>Note opzionali</strong>)
              sono raccolti ed elaborati al solo scopo di:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1 pl-2">
              <li>Preparare e consegnare l&apos;ordine all&apos;orario concordato.</li>
              <li>Contattare il cliente in caso di variazioni o chiarimenti sulle pietanze.</li>
            </ul>
          </section>

          <section className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
            <h3 className="font-bold text-xs uppercase tracking-wider mb-1">⚠️ Avviso Importante sulle Note e Allergie</h3>
            <p className="text-xs">
              Il campo note libere è a disposizione del cliente. Eventuali segnalazioni di allergie o intolleranze alimentari ivi inserite
              saranno trattate con la massima riservatezza e utilizzate unicamente dalla cucina per la sicurezza della preparazione.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-sm mb-1">3. Pagamenti e Dati di Carta</h2>
            <p>
              Nessun dato relativo a carte di credito o strumenti di pagamento bancari viene memorizzato sui server di {BRAND_CONFIG.name}.
              I pagamenti online, se abilitati dal locale, sono gestiti interamente dai circuiti certificati Stripe.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-slate-900 text-sm mb-1">4. Conservazione dei Dati</h2>
            <p>
              I dati relativi agli ordini vengono conservati per un periodo massimo di {settings.mesi_conservazione_ordini || 12} mesi
              e successivamente resi anonimi a fini statistici.
            </p>
          </section>

          {settings.testo_privacy && (
            <section className="pt-3 border-t border-slate-200">
              <h2 className="font-bold text-slate-900 text-sm mb-1">Note integrative del locale:</h2>
              <p className="italic text-slate-700">{settings.testo_privacy}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
