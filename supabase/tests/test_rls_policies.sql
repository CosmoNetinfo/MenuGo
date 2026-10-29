-- ==============================================================================
-- MENUGO: TEST AUTOMATIZZATO ISOLAMENTO RLS SU DATABASE
-- ==============================================================================
-- Autore: Daniele Spalletti, Cosmonet.info
-- Progetto: MenuGo
-- 
-- Questo script verifica realmente le policy RLS su PostgreSQL / Supabase:
-- 1. Due locali diversi: Locale Alpha e Locale Beta
-- 2. Due gestori diversi (Gestore Alpha e Gestore Beta)
-- 3. Un utente non autenticato (ruolo anon)
-- 4. Sicurezza: Gestori NON possono modificare la tabella locali (stato, piano, slug)
-- 5. Vincoli di chiave composta (locale_id, id) cross-tenant
--
-- Lo script viene eseguito all'interno di una transazione e termina con ROLLBACK,
-- garantendo che nessun dato di test rimanga salvato nel database.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    -- ID Locali
    v_loc_alpha UUID := 'a0000000-0000-0000-0000-000000000001';
    v_loc_beta  UUID := 'b0000000-0000-0000-0000-000000000002';

    -- ID Utenti simulati
    v_user_gestore_alpha UUID := '11111111-1111-1111-1111-111111111111';
    v_user_gestore_beta  UUID := '22222222-2222-2222-2222-222222222222';

    -- ID Categorie e Prodotti
    v_cat_alpha UUID := gen_random_uuid();
    v_cat_beta  UUID := gen_random_uuid();
    v_prod_alpha UUID := gen_random_uuid();
    v_prod_beta  UUID := gen_random_uuid();

    -- ID Ordini
    v_ord_alpha UUID := gen_random_uuid();
    v_ord_beta  UUID := gen_random_uuid();

    v_count INTEGER;
    v_updated INTEGER;
BEGIN
    RAISE NOTICE '>>> Inizio Test Isolamento RLS e Security Hardening MenuGo...';

    -- 1. Creazione utenti di autenticazione simulati in auth.users se non esistono
    INSERT INTO auth.users (id, email)
    VALUES 
        (v_user_gestore_alpha, 'gestore.alpha@test.example.com'),
        (v_user_gestore_beta,  'gestore.beta@test.example.com')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Creazione dei due locali
    INSERT INTO locali (id, slug, stato, piano)
    VALUES 
        (v_loc_alpha, 'locale-alpha-test', 'attivo', 'base'),
        (v_loc_beta,  'locale-beta-test',  'attivo', 'base');

    -- 3. Assegnazione gestori ai rispettivi locali
    INSERT INTO utenti_locale (locale_id, user_id, ruolo)
    VALUES 
        (v_loc_alpha, v_user_gestore_alpha, 'gestore'),
        (v_loc_beta,  v_user_gestore_beta,  'gestore');

    -- 4. Inserimento categorie e prodotti
    INSERT INTO categorie_menu (id, locale_id, nome)
    VALUES 
        (v_cat_alpha, v_loc_alpha, 'Categoria Alpha'),
        (v_cat_beta,  v_loc_beta,  'Categoria Beta');

    INSERT INTO prodotti (id, locale_id, categoria_id, nome, prezzo, disponibile)
    VALUES 
        (v_prod_alpha, v_loc_alpha, v_cat_alpha, 'Piatto Alpha', 1000, true),
        (v_prod_beta,  v_loc_beta,  v_cat_beta,  'Piatto Beta',  1200, true);

    -- 5. Inserimento ordini per ciascun locale
    INSERT INTO ordini (
        id, locale_id, codice_ordine, tipo_servizio, stato, metodo_pagamento,
        data_consegna, fascia_oraria, nome_cliente, cognome_cliente, telefono_cliente, totale
    )
    VALUES 
        (v_ord_alpha, v_loc_alpha, 'ORD-ALPHA-01', 'ritiro', 'in_attesa', 'contanti', CURRENT_DATE, '12:00', 'Mario', 'Alpha', '+39333000001', 1000),
        (v_ord_beta,  v_loc_beta,  'ORD-BETA-01',  'ritiro', 'in_attesa', 'contanti', CURRENT_DATE, '13:00', 'Luigi', 'Beta',  '+39333000002', 1200);

    -- =========================================================================
    -- TEST 1: Utente NON AUTENTICATO (ruolo anon)
    -- =========================================================================
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    -- Verifica 1A: anon vede i prodotti dei locali attivi
    SELECT COUNT(*) INTO v_count FROM prodotti WHERE id IN (v_prod_alpha, v_prod_beta);
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'TEST 1A FALLITO: anon dovrebbe vedere i 2 prodotti pubblici (trovati: %)', v_count;
    END IF;
    RAISE NOTICE '✓ TEST 1A SUPERATO: Utente anon vede i prodotti dei locali attivi';

    -- Verifica 1B: anon NON DEVE VEDERE gli ordini
    SELECT COUNT(*) INTO v_count FROM ordini WHERE id IN (v_ord_alpha, v_ord_beta);
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST 1B FALLITO: anon NON deve vedere gli ordini (trovati: %)', v_count;
    END IF;
    RAISE NOTICE '✓ TEST 1B SUPERATO: Utente anon non vede nessun ordine (RLS blocca lettura ordini)';

    -- =========================================================================
    -- TEST 2: GESTORE ALPHA (ruolo authenticated, JWT sub = v_user_gestore_alpha)
    -- =========================================================================
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_gestore_alpha::text, true);

    -- Verifica 2A: Gestore Alpha vede SOLO il proprio ordine
    SELECT COUNT(*) INTO v_count FROM ordini WHERE id IN (v_ord_alpha, v_ord_beta);
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 2A FALLITO: Gestore Alpha deve vedere 1 solo ordine (trovati: %)', v_count;
    END IF;
    RAISE NOTICE '✓ TEST 2A SUPERATO: Gestore Alpha vede solo l''ordine del proprio locale';

    -- Verifica 2B: Gestore Alpha tenta di modificare l'ordine di Beta -> 0 righe modificate
    UPDATE ordini SET note_cliente = 'Tentativo modifica non autorizzata' WHERE id = v_ord_beta;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 0 THEN
        RAISE EXCEPTION 'TEST 2B FALLITO: Gestore Alpha è riuscito a modificare l''ordine del locale Beta!';
    END IF;
    RAISE NOTICE '✓ TEST 2B SUPERATO: Gestore Alpha non può modificare ordini del locale Beta';

    -- Verifica 2C (Security Hardening): Gestore Alpha NON può modificare stato/slug del proprio locale
    UPDATE locali SET stato = 'sospeso' WHERE id = v_loc_alpha;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 0 THEN
        RAISE EXCEPTION 'TEST 2C FALLITO: Gestore Alpha non deve poter modificare la tabella locali!';
    END IF;
    RAISE NOTICE '✓ TEST 2C SUPERATO: Gestori non possono modificare la tabella locali (solo super admin/server)';

    -- =========================================================================
    -- TEST 3: GESTORE BETA (ruolo authenticated, JWT sub = v_user_gestore_beta)
    -- =========================================================================
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_user_gestore_beta::text, true);

    -- Verifica 3A: Gestore Beta vede SOLO il proprio ordine
    SELECT COUNT(*) INTO v_count FROM ordini WHERE id IN (v_ord_alpha, v_ord_beta);
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3A FALLITO: Gestore Beta deve vedere 1 solo ordine (trovati: %)', v_count;
    END IF;
    RAISE NOTICE '✓ TEST 3A SUPERATO: Gestore Beta vede solo l''ordine del proprio locale';

    -- Verifica 3B: Gestore Beta tenta di modificare l'ordine di Alpha -> 0 righe modificate
    UPDATE ordini SET note_cliente = 'Tentativo modifica non autorizzata' WHERE id = v_ord_alpha;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated <> 0 THEN
        RAISE EXCEPTION 'TEST 3B FALLITO: Gestore Beta è riuscito a modificare l''ordine del locale Alpha!';
    END IF;
    RAISE NOTICE '✓ TEST 3B SUPERATO: Gestore Beta non può modificare dati del locale Alpha';

    -- =========================================================================
    -- TEST 4: Verifica Vincoli di Chiave Composta (locale_id, id)
    -- =========================================================================
    -- Ripristino ruolo di servizio per verificare vincoli FK
    PERFORM set_config('role', 'postgres', true);
    BEGIN
        INSERT INTO prodotti (locale_id, categoria_id, nome, prezzo)
        VALUES (v_loc_beta, v_cat_alpha, 'Piatto Invalido Cross-Tenant', 500);
        
        RAISE EXCEPTION 'TEST 4 FALLITO: Il vincolo foreign key composto (locale_id, categoria_id) avrebbe dovuto impedire l''inserimento!';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE '✓ TEST 4 SUPERATO: Il vincolo composto impedisce l''assegnazione di categorie di altri locali';
    END;

    RAISE NOTICE '>>> TUTTI I TEST RLS E SECURITY HARDENING SUPERATI CON SUCCESSO! <<<';
END $$;

-- Rollback per pulire tutti i record di test
ROLLBACK;
