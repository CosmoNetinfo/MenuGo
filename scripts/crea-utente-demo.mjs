#!/usr/bin/env node
/**
 * Script: crea-utente-demo
 *
 * Crea nel database Supabase:
 *   1. Un super admin (inserito anche in public.super_admins)
 *   2. Un gestore collegato a trattoria-demo (inserito in public.utenti_locale)
 *
 * Le password sono generate casualmente e mostrate SOLO in console.
 * Non vengono mai scritte in file né nel repository.
 *
 * Uso: npm run crea-utente-demo
 *
 * Prerequisiti:
 *   - File .env.local con NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *   - Il seed deve essere già eseguito (locale trattoria-demo presente)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Carica variabili d'ambiente da .env.local (senza librerie esterne)
// ---------------------------------------------------------------------------
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
    // .env.local non trovato: usa le variabili già nel processo
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generaPassword(lunghezza = 20) {
  // Password casuale con caratteri alfanumerici + simboli sicuri
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  const bytes = randomBytes(lunghezza);
  return Array.from(bytes)
    .map((b) => charset[b % charset.length])
    .join('');
}

function separator() {
  console.log('─'.repeat(60));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌  Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
    console.error('   Assicurati di avere un file .env.local nella root del progetto.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  separator();
  console.log('🚀  MenuGo — Creazione utenti demo');
  separator();

  // -------------------------------------------------------------------------
  // 1. Recupera l'ID del locale trattoria-demo
  // -------------------------------------------------------------------------
  const { data: locale, error: localeErr } = await supabase
    .from('locali')
    .select('id, slug')
    .eq('slug', 'trattoria-demo')
    .single();

  if (localeErr || !locale) {
    console.error('❌  Locale "trattoria-demo" non trovato nel database.');
    console.error('   Esegui prima il seed: psql ... -f supabase/seed.sql');
    process.exit(1);
  }

  console.log(`✓  Locale trovato: ${locale.slug} (${locale.id})`);

  // -------------------------------------------------------------------------
  // 2. Crea il super admin
  // -------------------------------------------------------------------------
  const superEmail = `superadmin+${Date.now()}@menugo-demo.local`;
  const superPassword = generaPassword();

  console.log('\n📋  Creazione Super Admin…');

  // Controlla se esiste già un super admin con questa email (non dovrebbe)
  const { data: superUser, error: superErr } =
    await supabase.auth.admin.createUser({
      email: superEmail,
      password: superPassword,
      email_confirm: true, // Non richiede conferma email
    });

  if (superErr) {
    console.error('❌  Errore creazione super admin:', superErr.message);
    process.exit(1);
  }

  // Inserisce in public.super_admins
  const { error: insertSuperErr } = await supabase
    .from('super_admins')
    .insert({ id: superUser.user.id, email: superEmail });

  if (insertSuperErr) {
    console.error('❌  Errore inserimento in super_admins:', insertSuperErr.message);
    // Pulizia: elimina l'utente Auth appena creato
    await supabase.auth.admin.deleteUser(superUser.user.id);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 3. Crea il gestore
  // -------------------------------------------------------------------------
  const gestoreEmail = `gestore+${Date.now()}@menugo-demo.local`;
  const gestorePassword = generaPassword();

  console.log('📋  Creazione Gestore…');

  const { data: gestoreUser, error: gestoreErr } =
    await supabase.auth.admin.createUser({
      email: gestoreEmail,
      password: gestorePassword,
      email_confirm: true,
    });

  if (gestoreErr) {
    console.error('❌  Errore creazione gestore:', gestoreErr.message);
    process.exit(1);
  }

  // Collega il gestore al locale trattoria-demo
  const { error: insertGestoreErr } = await supabase
    .from('utenti_locale')
    .insert({
      user_id: gestoreUser.user.id,
      locale_id: locale.id,
      ruolo: 'gestore',
    });

  if (insertGestoreErr) {
    console.error('❌  Errore inserimento in utenti_locale:', insertGestoreErr.message);
    await supabase.auth.admin.deleteUser(gestoreUser.user.id);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 4. Mostra le credenziali in console (SOLO QUI, mai in file)
  // -------------------------------------------------------------------------
  separator();
  console.log('✅  UTENTI CREATI CON SUCCESSO');
  separator();
  console.log('\n🔐  SUPER ADMIN');
  console.log(`   URL accesso : ${supabaseUrl.replace('https://', '').split('.')[0]}.supabase.co → /super/login`);
  console.log(`   Email       : ${superEmail}`);
  console.log(`   Password    : ${superPassword}`);
  console.log('\n🔑  GESTORE (Trattoria Demo)');
  console.log(`   URL accesso : /admin/login`);
  console.log(`   Email       : ${gestoreEmail}`);
  console.log(`   Password    : ${gestorePassword}`);
  separator();
  console.log('\n⚠️   Salva queste credenziali ORA — non verranno mostrate di nuovo.');
  console.log('    NON condividerle via email o chat in chiaro.\n');
}

main().catch((err) => {
  console.error('Errore inatteso:', err);
  process.exit(1);
});
