-- ==============================================================================
-- MIGRAZIONE 4: SECURITY HARDENING (FUNZIONI, TABELLA LOCALI E STORAGE)
-- ==============================================================================
-- Autore: Daniele Spalletti, Cosmonet.info
-- Progetto: MenuGo
-- ==============================================================================

-- 1. Togli la policy di aggiornamento per i gestori sulla tabella locali
-- (Stato, piano e slug possono essere modificati solo da super admin o server)
DROP POLICY IF EXISTS "Gestori: aggiornamento del proprio locale" ON locali;

-- 2. Ricostruzione delle funzioni di sicurezza con search_path esplicito
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM super_admins WHERE id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_gestore_of(check_user_id UUID, target_locale_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM utenti_locale
        WHERE user_id = check_user_id AND locale_id = target_locale_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoca execute su funzioni di sicurezza per anon e public
REVOKE EXECUTE ON FUNCTION is_super_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_gestore_of(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_gestore_of(UUID, UUID) TO authenticated, service_role;

-- 3. Rimuovi policy di SELECT su storage.objects per locali-media
-- (I file nel bucket pubblico 'locali-media' vengono scaricati via CDN pubblica senza SELECT diretta sui metadati storage)
DROP POLICY IF EXISTS "Accesso pubblico in lettura ai media dei locali" ON storage.objects;
