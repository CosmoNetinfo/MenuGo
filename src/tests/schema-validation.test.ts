import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Verifica di integrità dello Schema SQL, Vincoli e RLS (Fase 1 Aggiornata)', () => {
  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
  const supabaseDir = path.resolve(__dirname, '../../supabase');

  it('verifica la presenza delle 3 migrazioni SQL strutturali (senza seed)', () => {
    const files = fs.readdirSync(migrationsDir);
    expect(files).toContain('20261029000001_schema_multi_locale.sql');
    expect(files).toContain('20261029000002_rls_policies.sql');
    expect(files).toContain('20261029000003_storage_buckets.sql');
    // Il seed deve essere fuori dalle migrazioni
    expect(files).not.toContain('20261029000004_seed_demo.sql');
  });

  it('il seed demo è posizionato correttamente in supabase/seed.sql', () => {
    const seedPath = path.join(supabaseDir, 'seed.sql');
    expect(fs.existsSync(seedPath)).toBe(true);
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    expect(seedSql).toContain('trattoria-demo');
    expect(seedSql).toContain('Trattoria Demo');
    expect(seedSql).toContain('zone_consegna');
  });

  it('tutte le tabelle tenant hanno la colonna locale_id e RLS abilitato', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');
    const rlsSql = fs.readFileSync(path.join(migrationsDir, '20261029000002_rls_policies.sql'), 'utf-8');

    const expectedTenantTables = [
      'utenti_locale',
      'locale_branding',
      'locale_settings',
      'zone_consegna',
      'destinazioni',
      'fasce_orarie',
      'calendario_giorni',
      'categorie_menu',
      'prodotti',
      'gruppi_opzioni',
      'opzioni',
      'menu_fissi',
      'menu_fissi_slot',
      'piatti_del_giorno',
      'ordini',
      'righe_ordine'
    ];

    for (const table of expectedTenantTables) {
      expect(schemaSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      expect(rlsSql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it('le tabelle figlie utilizzano chiavi composte (locale_id, id) verso le tabelle madri', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');

    // Verifica vincoli composti nelle tabelle
    expect(schemaSql).toContain('CONSTRAINT uq_destinazioni_locale_id UNIQUE (locale_id, id)');
    expect(schemaSql).toContain('CONSTRAINT uq_categorie_menu_locale_id UNIQUE (locale_id, id)');
    expect(schemaSql).toContain('CONSTRAINT uq_prodotti_locale_id UNIQUE (locale_id, id)');
    expect(schemaSql).toContain('CONSTRAINT uq_gruppi_opzioni_locale_id UNIQUE (locale_id, id)');
    expect(schemaSql).toContain('CONSTRAINT uq_menu_fissi_locale_id UNIQUE (locale_id, id)');
    expect(schemaSql).toContain('CONSTRAINT uq_ordini_locale_id UNIQUE (locale_id, id)');

    // Verifica foreign key composte
    expect(schemaSql).toContain('REFERENCES destinazioni(locale_id, id)');
    expect(schemaSql).toContain('REFERENCES categorie_menu(locale_id, id)');
    expect(schemaSql).toContain('REFERENCES prodotti(locale_id, id)');
    expect(schemaSql).toContain('REFERENCES gruppi_opzioni(locale_id, id)');
    expect(schemaSql).toContain('REFERENCES menu_fissi(locale_id, id)');
    expect(schemaSql).toContain('REFERENCES ordini(locale_id, id)');
  });

  it('calendario_giorni gestisce l\'unicità con indici parziali per destinazione null e non-null', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');
    expect(schemaSql).toContain('idx_calendario_dest_giorno');
    expect(schemaSql).toContain('WHERE destinazione_id IS NOT NULL');
    expect(schemaSql).toContain('idx_calendario_globale_giorno');
    expect(schemaSql).toContain('WHERE destinazione_id IS NULL');
  });

  it('la tabella ordini include UNIQUE (locale_id, codice_ordine), costo_consegna e indirizzo_consegna', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');
    expect(schemaSql).toContain('CONSTRAINT uq_ordini_locale_codice UNIQUE (locale_id, codice_ordine)');
    expect(schemaSql).toContain('costo_consegna INTEGER NOT NULL DEFAULT 0 CHECK (costo_consegna >= 0)');
    expect(schemaSql).toContain('indirizzo_consegna TEXT');
  });

  it('tutti i vincoli CHECK >= 0 e congruenza orari sono presenti', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');
    expect(schemaSql).toContain('CHECK (prezzo >= 0)');
    expect(schemaSql).toContain('CHECK (totale >= 0)');
    expect(schemaSql).toContain('CHECK (commissione_carta_valore >= 0)');
    expect(schemaSql).toContain('CHECK (costo >= 0)');
    expect(schemaSql).toContain('CHECK (ora_fine > ora_inizio)');
  });

  it('tutti i trigger sono idempotenti con DROP TRIGGER IF EXISTS', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');
    expect(schemaSql).toContain('DROP TRIGGER IF EXISTS update_locali_updated_at ON locali;');
    expect(schemaSql).toContain('DROP TRIGGER IF EXISTS update_locale_branding_updated_at ON locale_branding;');
    expect(schemaSql).toContain('DROP TRIGGER IF EXISTS update_locale_settings_updated_at ON locale_settings;');
    expect(schemaSql).toContain('DROP TRIGGER IF EXISTS update_ordini_updated_at ON ordini;');
  });

  it('il bucket Storage ammette SOLO PNG, JPG e WebP', () => {
    const storageSql = fs.readFileSync(path.join(migrationsDir, '20261029000003_storage_buckets.sql'), 'utf-8');
    expect(storageSql).toContain("ARRAY['image/png', 'image/jpeg', 'image/webp']");
    expect(storageSql).not.toContain('image/svg+xml');
  });

  it('è presente lo script di test SQL automatizzato per RLS su database', () => {
    const testSqlPath = path.join(supabaseDir, 'tests/test_rls_policies.sql');
    expect(fs.existsSync(testSqlPath)).toBe(true);
    const testSql = fs.readFileSync(testSqlPath, 'utf-8');
    expect(testSql).toContain('v_user_gestore_alpha');
    expect(testSql).toContain('v_user_gestore_beta');
    expect(testSql).toContain("set_config('role', 'anon', true)");
  });
});
