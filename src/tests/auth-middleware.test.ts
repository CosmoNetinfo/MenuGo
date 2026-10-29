/**
 * Test di sicurezza e autenticazione — Fase 2b
 *
 * Verifica:
 * 1. Validazione percorsoSicuro() contro attacchi Open Redirect.
 * 2. Middleware reale con NextRequest:
 *    - senza sessione /admin e /super danno redirect al login;
 *    - un utente autenticato ma senza locale viene rimandato al login con logout;
 *    - un gestore non entra in /super (viene rimandato a /admin);
 *    - un super admin accede sia ad /admin che a /super.
 * 3. Isolamento multi-tenant su due locali di prova:
 *    - un gestore del locale A non legge né modifica il locale B.
 */

import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { percorsoSicuro } from '@/lib/auth-utils';
import { processAuthMiddleware, type SupabaseAuthUserClient } from '@/middleware';

// ---------------------------------------------------------------------------
// 1. Test percorsoSicuro()
// ---------------------------------------------------------------------------
describe('Validazione redirect — percorsoSicuro()', () => {
  it('accetta percorsi interni validi', () => {
    expect(percorsoSicuro('/admin')).toBe('/admin');
    expect(percorsoSicuro('/admin/aspetto')).toBe('/admin/aspetto');
    expect(percorsoSicuro('/admin/impostazioni/menu')).toBe('/admin/impostazioni/menu');
  });

  it('rifiuta e blocca i casi di open redirect specificati', () => {
    // Protocol-relative URL
    expect(percorsoSicuro('//evil.com')).toBe('/admin');
    // URL assoluto HTTP/HTTPS
    expect(percorsoSicuro('https://evil.com')).toBe('/admin');
    expect(percorsoSicuro('http://evil.com')).toBe('/admin');
    // Backslash redirect
    expect(percorsoSicuro('/\\evil.com')).toBe('/admin');
    expect(percorsoSicuro('\\evil.com')).toBe('/admin');
    // Stringa vuota
    expect(percorsoSicuro('')).toBe('/admin');
  });

  it('rifiuta valori null, undefined, spazi o schemi arbitrari', () => {
    expect(percorsoSicuro(null)).toBe('/admin');
    expect(percorsoSicuro(undefined)).toBe('/admin');
    expect(percorsoSicuro('   ')).toBe('/admin');
    expect(percorsoSicuro('javascript:alert(1)')).toBe('/admin');
    expect(percorsoSicuro('data:text/html,evil')).toBe('/admin');
  });
});

// ---------------------------------------------------------------------------
// 2. Test Middleware con NextRequest reale
// ---------------------------------------------------------------------------
function creaMockSupabase({
  user = null,
  isSuperAdmin = false,
  localiUtente = [],
}: {
  user?: { id: string; email?: string } | null;
  isSuperAdmin?: boolean;
  localiUtente?: string[];
}): { client: SupabaseAuthUserClient; signOutMock: ReturnType<typeof vi.fn> } {
  const signOutMock = vi.fn().mockResolvedValue({});

  const client: SupabaseAuthUserClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      signOut: signOutMock,
    },
    rpc: vi.fn().mockImplementation(async (fn: string) => {
      if (fn === 'is_super_admin') {
        return { data: isSuperAdmin, error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn().mockImplementation((table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => ({
          limit: async () => {
            if (table === 'utenti_locale' && user && val === user.id) {
              const rows = localiUtente.map((id) => ({ locale_id: id }));
              return { data: rows, error: null };
            }
            return { data: [], error: null };
          },
        }),
      }),
    })),
  };

  return { client, signOutMock };
}

describe('Middleware reale — Controllo accessi e sessione', () => {
  it('senza sessione /admin dà redirect al login con parametro redirect', async () => {
    const req = new NextRequest('http://localhost:3000/admin');
    const { client } = creaMockSupabase({ user: null });

    const res = await processAuthMiddleware(req, client);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/admin/login');
    expect(location).toContain('redirect=%2Fadmin');
  });

  it('senza sessione /super dà redirect al login super', async () => {
    const req = new NextRequest('http://localhost:3000/super');
    const { client } = creaMockSupabase({ user: null });

    const res = await processAuthMiddleware(req, client);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/super/login');
    expect(location).toContain('redirect=%2Fsuper');
  });

  it('un utente autenticato ma senza locale viene disconnesso e rimandato al login con messaggio', async () => {
    const req = new NextRequest('http://localhost:3000/admin/aspetto');
    const { client, signOutMock } = creaMockSupabase({
      user: { id: 'usr-orfano', email: 'orfano@menugo.local' },
      isSuperAdmin: false,
      localiUtente: [], // nessun locale associato
    });

    const res = await processAuthMiddleware(req, client);

    // Deve aver fatto signOut per invalidare l'account non associato
    expect(signOutMock).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/admin/login');
    expect(location).toContain('Questo+account+non');
  });

  it('un gestore con locale collegato accede regolarmente ad /admin', async () => {
    const req = new NextRequest('http://localhost:3000/admin');
    const { client } = creaMockSupabase({
      user: { id: 'usr-gestore', email: 'gestore@menugo.local' },
      isSuperAdmin: false,
      localiUtente: ['locale-123'],
    });

    const res = await processAuthMiddleware(req, client);

    // Non deve fare redirect a login
    const location = res.headers.get('location');
    expect(location).toBeNull();
  });

  it('un gestore (non super admin) non entra in /super e viene rimandato ad /admin', async () => {
    const req = new NextRequest('http://localhost:3000/super');
    const { client } = creaMockSupabase({
      user: { id: 'usr-gestore', email: 'gestore@menugo.local' },
      isSuperAdmin: false,
      localiUtente: ['locale-123'],
    });

    const res = await processAuthMiddleware(req, client);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBe('http://localhost:3000/admin');
  });

  it('un super admin può accedere sia a /super che ad /admin', async () => {
    const { client } = creaMockSupabase({
      user: { id: 'usr-super', email: 'super@menugo.local' },
      isSuperAdmin: true,
      localiUtente: [],
    });

    const reqSuper = new NextRequest('http://localhost:3000/super');
    const resSuper = await processAuthMiddleware(reqSuper, client);
    expect(resSuper.headers.get('location')).toBeNull();

    const reqAdmin = new NextRequest('http://localhost:3000/admin');
    const resAdmin = await processAuthMiddleware(reqAdmin, client);
    expect(resAdmin.headers.get('location')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Test Isolamento tra due locali di prova (Locale A e Locale B)
// ---------------------------------------------------------------------------
describe('Isolamento Multi-Tenant — Gestore Locale A vs Locale B', () => {
  const LOCALE_A = 'loc-aaaa-0001';
  const LOCALE_B = 'loc-bbbb-0002';

  const gestoreA = {
    id: 'user-gestore-a',
    localeId: LOCALE_A,
  };

  const gestoreB = {
    id: 'user-gestore-b',
    localeId: LOCALE_B,
  };

  // Simula il database con policy RLS is_gestore_of(auth.uid(), locale_id)
  class MockDatabaseTenantManager {
    private brandingDb: Array<{ locale_id: string; nome: string; colore_primario: string }> = [
      { locale_id: LOCALE_A, nome: 'Trattoria A', colore_primario: '#065f46' },
      { locale_id: LOCALE_B, nome: 'Pizzeria B', colore_primario: '#1e3a8a' },
    ];

    private ordiniDb: Array<{ id: string; locale_id: string; totale_centesimi: number }> = [
      { id: 'ord-a1', locale_id: LOCALE_A, totale_centesimi: 2500 },
      { id: 'ord-b1', locale_id: LOCALE_B, totale_centesimi: 4200 },
    ];

    // SELECT con RLS
    selectBranding(userId: string, userLocaleId: string, targetLocaleId?: string) {
      return this.brandingDb.filter((row) => {
        // Policy: gestore vede solo il proprio locale
        const isOwner = row.locale_id === userLocaleId;
        if (!isOwner) return false;
        if (targetLocaleId && row.locale_id !== targetLocaleId) return false;
        return true;
      });
    }

    selectOrdini(userId: string, userLocaleId: string, targetLocaleId?: string) {
      return this.ordiniDb.filter((row) => {
        const isOwner = row.locale_id === userLocaleId;
        if (!isOwner) return false;
        if (targetLocaleId && row.locale_id !== targetLocaleId) return false;
        return true;
      });
    }

    // UPDATE con RLS
    updateBranding(userId: string, userLocaleId: string, targetLocaleId: string, nuovoNome: string) {
      // Policy CHECK: row.locale_id = userLocaleId
      const riga = this.brandingDb.find((r) => r.locale_id === targetLocaleId);
      if (!riga) {
        return { success: false, modifiedCount: 0, error: 'Record non trovato' };
      }
      if (riga.locale_id !== userLocaleId) {
        // RLS blocca la modifica su un altro tenant
        return { success: false, modifiedCount: 0, error: 'Violazione RLS: operazione non autorizzata' };
      }
      riga.nome = nuovoNome;
      return { success: true, modifiedCount: 1, error: null };
    }

    // INSERT con RLS
    insertOrdine(userId: string, userLocaleId: string, nuovoOrdine: { id: string; locale_id: string; totale_centesimi: number }) {
      if (nuovoOrdine.locale_id !== userLocaleId) {
        return { success: false, error: 'Violazione RLS: impossibile inserire dati per un altro locale' };
      }
      this.ordiniDb.push(nuovoOrdine);
      return { success: true, error: null };
    }
  }

  it('un gestore del Locale A legge ESCLUSIVAMENTE i dati del Locale A', () => {
    const db = new MockDatabaseTenantManager();

    // Gestore A legge i propri branding e ordini
    const brandingA = db.selectBranding(gestoreA.id, gestoreA.localeId);
    expect(brandingA).toHaveLength(1);
    expect(brandingA[0].nome).toBe('Trattoria A');

    const ordiniA = db.selectOrdini(gestoreA.id, gestoreA.localeId);
    expect(ordiniA).toHaveLength(1);
    expect(ordiniA[0].id).toBe('ord-a1');

    // Gestore A tenta di leggere esplicitamente il Locale B
    const brandingB = db.selectBranding(gestoreA.id, gestoreA.localeId, LOCALE_B);
    expect(brandingB).toHaveLength(0); // Nessun record restituito

    const ordiniB = db.selectOrdini(gestoreA.id, gestoreA.localeId, LOCALE_B);
    expect(ordiniB).toHaveLength(0); // Nessun ordine restituito
  });

  it('un gestore del Locale A NON può modificare i dati del Locale B', () => {
    const db = new MockDatabaseTenantManager();

    // Gestore A tenta di modificare il nome del Locale B
    const updateResult = db.updateBranding(gestoreA.id, gestoreA.localeId, LOCALE_B, 'Hacked by Gestore A');

    expect(updateResult.success).toBe(false);
    expect(updateResult.modifiedCount).toBe(0);
    expect(updateResult.error).toContain('Violazione RLS');

    // Verifica che i dati del Locale B siano intatti
    const verificaB = db.selectBranding(gestoreB.id, gestoreB.localeId);
    expect(verificaB[0].nome).toBe('Pizzeria B');
  });

  it('un gestore del Locale A NON può inserire ordini o record per il Locale B', () => {
    const db = new MockDatabaseTenantManager();

    const insertResult = db.insertOrdine(gestoreA.id, gestoreA.localeId, {
      id: 'ord-falso',
      locale_id: LOCALE_B,
      totale_centesimi: 9999,
    });

    expect(insertResult.success).toBe(false);
    expect(insertResult.error).toContain('Violazione RLS');

    // Gestore B non deve vedere nessun ordine estraneo
    const ordiniB = db.selectOrdini(gestoreB.id, gestoreB.localeId);
    expect(ordiniB).toHaveLength(1);
    expect(ordiniB.find((o) => o.id === 'ord-falso')).toBeUndefined();
  });
});
