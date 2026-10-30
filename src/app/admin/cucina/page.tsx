import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = {
  title: 'Vista Cucina Stampabile — MenuGo',
};

export default async function CucinaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: utente } = await supabase
    .from('utenti_locale')
    .select('locale_id, locali(slug)')
    .eq('user_id', user.id)
    .single();

  if (!utente?.locale_id) redirect('/admin/login');

  const oggiStr = new Date().toISOString().split('T')[0];
  const adminClient = createAdminClient();

  const { data: ordini } = await adminClient
    .from('ordini')
    .select('*, righe_ordine(*)')
    .eq('locale_id', utente.locale_id)
    .eq('data_consegna', oggiStr)
    .neq('stato', 'annullato')
    .order('fascia_oraria', { ascending: true });

  const ordiniList = ordini || [];

  // Conteggio piatti totali da preparare
  const riepilogoPiatti: Record<string, number> = {};
  for (const ord of ordiniList) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (ord.righe_ordine || []) as any[]) {
      const nome = r.nome_snapshot;
      riepilogoPiatti[nome] = (riepilogoPiatti[nome] || 0) + r.quantita;
    }
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header non stampabile per controlli */}
        <div className="print:hidden flex items-center justify-between pb-4 border-b border-gray-200">
          <Link href="/admin" className="text-xs font-bold text-gray-600 hover:text-black">
            ← Torna al pannello
          </Link>
          <div className="flex gap-2">
            <button
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              onClick={() => globalThis.print?.()}
              className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition"
            >
              🖨️ Stampa Foglio Cucina
            </button>
          </div>
        </div>

        {/* Intestazione Foglio */}
        <div className="border-b-2 border-black pb-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Foglio di Lavoro Cucina</h1>
            <p className="text-sm font-semibold text-gray-700">
              Data: {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black">{ordiniList.length}</span>
            <span className="text-xs block text-gray-600 uppercase font-bold">Ordini da evadere</span>
          </div>
        </div>

        {/* 1. Totale Porzioni Da Preparare */}
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-black">
            1. Conteggio Totale Porzioni
          </h2>

          {Object.keys(riepilogoPiatti).length === 0 ? (
            <p className="text-xs text-gray-500 italic">Nessun ordine programmato per oggi.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(riepilogoPiatti).map(([nome, qta]) => (
                <div key={nome} className="p-3 border-2 border-black rounded-lg flex items-center justify-between">
                  <span className="font-bold text-sm leading-tight">{nome}</span>
                  <span className="text-2xl font-black ml-2">{qta}x</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Dettaglio Ordini Per Orario e Fascia */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider bg-gray-100 p-2 border-l-4 border-black">
            2. Dettaglio Ordini in Ordine Orario
          </h2>

          <div className="space-y-4">
            {ordiniList.map((ord) => (
              <div key={ord.id} className="border-2 border-gray-300 rounded-xl p-4 space-y-2 page-break-inside-avoid">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black bg-black text-white px-2 py-0.5 rounded">
                      {ord.codice_ordine}
                    </span>
                    <span className="font-bold text-sm">
                      {ord.nome_cliente} {ord.cognome_cliente}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-base">{ord.fascia_oraria}</span>
                    <span className="text-[11px] block text-gray-600 capitalize">
                      {ord.tipo_servizio === 'domicilio' && `Domicilio (${ord.indirizzo_consegna})`}
                      {ord.tipo_servizio === 'ritiro' && 'Ritiro al banco'}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {ord.tipo_servizio === 'destinazione_programmata' && `Punto fisso (${(ord.destinazione_snapshot as any)?.nome})`}
                    </span>
                  </div>
                </div>

                {/* Portate */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(ord.righe_ordine || []).map((r: any) => (
                    <div key={r.id} className="p-1.5 bg-gray-50 border rounded font-semibold flex justify-between">
                      <span>{r.nome_snapshot}</span>
                      <span className="font-black ml-1">{r.quantita}x</span>
                    </div>
                  ))}
                </div>

                {/* Note cucina */}
                {ord.note_cliente && (
                  <div className="text-xs bg-amber-50 p-2 border border-amber-300 rounded font-medium text-amber-900 mt-2">
                    ⚠️ Nota: {ord.note_cliente}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
