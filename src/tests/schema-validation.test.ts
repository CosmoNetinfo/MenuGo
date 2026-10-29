import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Verifica di integrità dello Schema SQL e Migrazioni (Fase 1)', () => {
  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');

  it('verifica la presenza di tutte le 4 migrazioni SQL previste', () => {
    const files = fs.readdirSync(migrationsDir);
    expect(files).toContain('20261029000001_schema_multi_locale.sql');
    expect(files).toContain('20261029000002_rls_policies.sql');
    expect(files).toContain('20261029000003_storage_buckets.sql');
    expect(files).toContain('20261029000004_seed_demo.sql');
  });

  it('tutte le tabelle tenant hanno la colonna locale_id e RLS abilitato', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');
    const rlsSql = fs.readFileSync(path.join(migrationsDir, '20261029000002_rls_policies.sql'), 'utf-8');

    const expectedTenantTables = [
      'utenti_locale',
      'locale_branding',
      'locale_settings',
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
      expect(schemaSql).toContain(`locale_id UUID NOT NULL REFERENCES locali(id)`);
      expect(rlsSql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it('gli importi monetari sono rigorosamente INTEGER (centesimi) e non FLOAT o DECIMAL', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '20261029000001_schema_multi_locale.sql'), 'utf-8');

    // Regola 7: importi salvati in centesimi (integer)
    expect(schemaSql).toMatch(/prezzo\s+INTEGER\s+NOT\s+NULL/i);
    expect(schemaSql).toMatch(/totale\s+INTEGER\s+NOT\s+NULL/i);
    expect(schemaSql).toMatch(/prezzo_extra\s+INTEGER\s+NOT\s+NULL/i);
    expect(schemaSql).toMatch(/totale_riga\s+INTEGER\s+NOT\s+NULL/i);

    // Non devono esserci tipi a virgola mobile per importi
    expect(schemaSql).not.toMatch(/prezzo\s+(NUMERIC|DECIMAL|FLOAT|REAL|DOUBLE)/i);
    expect(schemaSql).not.toMatch(/totale\s+(NUMERIC|DECIMAL|FLOAT|REAL|DOUBLE)/i);
  });

  it('il seed contiene il locale demo "trattoria-demo" con dati fittizi', () => {
    const seedSql = fs.readFileSync(path.join(migrationsDir, '20261029000004_seed_demo.sql'), 'utf-8');
    expect(seedSql).toContain('trattoria-demo');
    expect(seedSql).toContain('Trattoria Demo');
    expect(seedSql).toContain('Sede Aziendale Nexus Tech');
    expect(seedSql).toContain('Polo Direzionale Galileo');
    // Verifica presenza di ordini generati
    expect(seedSql).toContain('ORD-DEMO-');
  });

  it('esiste lo script di cancellazione dati demo clean_demo.sql', () => {
    const cleanSqlPath = path.resolve(__dirname, '../../supabase/clean_demo.sql');
    expect(fs.existsSync(cleanSqlPath)).toBe(true);
    const cleanSql = fs.readFileSync(cleanSqlPath, 'utf-8');
    expect(cleanSql).toContain("trattoria-demo");
  });
});
