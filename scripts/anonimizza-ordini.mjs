import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

function loadEnv() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dirname, '..', '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Usa le variabili già presenti nell'ambiente
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRORE: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono obbligatori in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('🔒 Avvio processo di anonimizzazione ordini per conformità GDPR...');

  // 1. Carica tutti i locali e le relative impostazioni di conservazione
  const { data: settingsList, error: errSettings } = await supabase
    .from('locale_settings')
    .select('locale_id, mesi_conservazione_ordini, locali(slug)');

  if (errSettings) {
    console.error('❌ Errore durante il recupero dei locali:', errSettings.message);
    process.exit(1);
  }

  let totaleAnonimizzati = 0;

  for (const item of settingsList || []) {
    const mesi = item.mesi_conservazione_ordini || 12;
    const slug = item.locali?.slug || item.locale_id;

    // Calcola data limite (oggi meno N mesi)
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - mesi);
    const dataLimiteIso = dataLimite.toISOString();

    // 2. Aggiorna gli ordini antecedenti la data limite
    const { data: ordiniAggiornati, error: errUpdate } = await supabase
      .from('ordini')
      .update({
        nome_cliente: 'Cliente',
        cognome_cliente: 'Anonimizzato',
        telefono_cliente: '—',
        indirizzo_consegna: null,
        note_cliente: null,
        destinazione_snapshot: null,
        anonimizzato: true,
      })
      .eq('locale_id', item.locale_id)
      .eq('anonimizzato', false)
      .lt('created_at', dataLimiteIso)
      .select('id');

    if (errUpdate) {
      console.warn(`⚠️ Errore anonimizzazione per locale ${slug}:`, errUpdate.message);
    } else {
      const count = ordiniAggiornati?.length || 0;
      totaleAnonimizzati += count;
      if (count > 0) {
        console.log(`✅ Locale "${slug}": anonimizzati ${count} ordini anteriori a ${dataLimiteIso.slice(0, 10)} (${mesi} mesi)`);
      }
    }
  }

  console.log(`\n🎉 Processo completato: ${totaleAnonimizzati} ordini anonimizzati con successo.`);
  console.log('Tutti i totali contabili e lo storico delle vendite rimangono intatti per fini statistici e fiscali.');
}

main().catch((err) => {
  console.error('❌ Errore imprevisto:', err);
  process.exit(1);
});
