-- ==============================================================================
-- MIGRAZIONE 2: ROW LEVEL SECURITY (RLS) E FUNZIONI DI CONTROLLO ACCESSI
-- ==============================================================================
-- Autore: Daniele Spalletti, Cosmonet.info
-- Progetto: MenuGo
-- ==============================================================================

-- 1. Funzioni di verifica sicurezza (SECURITY DEFINER per evitare ricorsione RLS)
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM super_admins WHERE id = check_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_gestore_of(check_user_id UUID, target_locale_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM utenti_locale
        WHERE user_id = check_user_id AND locale_id = target_locale_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Abilitazione RLS su tutte le tabelle operative
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE locali ENABLE ROW LEVEL SECURITY;
ALTER TABLE utenti_locale ENABLE ROW LEVEL SECURITY;
ALTER TABLE locale_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE locale_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasce_orarie ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_giorni ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorie_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE prodotti ENABLE ROW LEVEL SECURITY;
ALTER TABLE gruppi_opzioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE opzioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_fissi ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_fissi_slot ENABLE ROW LEVEL SECURITY;
ALTER TABLE piatti_del_giorno ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordini ENABLE ROW LEVEL SECURITY;
ALTER TABLE righe_ordine ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. POLICIES: SUPER_ADMINS
-- ==============================================================================
CREATE POLICY "Super admin possono gestire tabella super_admins"
    ON super_admins FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ==============================================================================
-- 4. POLICIES: LOCALI
-- ==============================================================================
CREATE POLICY "Pubblico: lettura locali attivi"
    ON locali FOR SELECT
    TO anon, authenticated
    USING (stato = 'attivo');

CREATE POLICY "Super admin: gestione totale locali"
    ON locali FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Gestori: lettura del proprio locale"
    ON locali FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), id));

CREATE POLICY "Gestori: aggiornamento del proprio locale"
    ON locali FOR UPDATE
    TO authenticated
    USING (is_gestore_of(auth.uid(), id))
    WITH CHECK (is_gestore_of(auth.uid(), id));

-- ==============================================================================
-- 5. POLICIES: UTENTI_LOCALE
-- ==============================================================================
CREATE POLICY "Super admin: gestione totale utenti locale"
    ON utenti_locale FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Utenti: lettura delle proprie associazioni locali"
    ON utenti_locale FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Gestori: lettura staff del proprio locale"
    ON utenti_locale FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 6. POLICIES: LOCALE_BRANDING
-- ==============================================================================
CREATE POLICY "Pubblico: lettura branding locale attivo"
    ON locale_branding FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = locale_branding.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Super admin: gestione branding"
    ON locale_branding FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Gestori: gestione branding del proprio locale"
    ON locale_branding FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 7. POLICIES: LOCALE_SETTINGS
-- ==============================================================================
CREATE POLICY "Pubblico: lettura impostazioni per locali attivi"
    ON locale_settings FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = locale_settings.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Super admin: gestione settings"
    ON locale_settings FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Gestori: gestione settings del proprio locale"
    ON locale_settings FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 8. POLICIES: DESTINAZIONI E FASCE ORARIE
-- ==============================================================================
CREATE POLICY "Pubblico: lettura destinazioni attive"
    ON destinazioni FOR SELECT
    TO anon, authenticated
    USING (attiva = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = destinazioni.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Super admin: gestione destinazioni"
    ON destinazioni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Gestori: gestione destinazioni del proprio locale"
    ON destinazioni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Pubblico: lettura fasce orarie attive"
    ON fasce_orarie FOR SELECT
    TO anon, authenticated
    USING (attiva = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = fasce_orarie.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Super admin: gestione fasce orarie"
    ON fasce_orarie FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Gestori: gestione fasce orarie del proprio locale"
    ON fasce_orarie FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 9. POLICIES: CALENDARIO_GIORNI
-- ==============================================================================
CREATE POLICY "Pubblico: lettura calendario per locali attivi"
    ON calendario_giorni FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = calendario_giorni.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Super admin: gestione calendario"
    ON calendario_giorni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Gestori: gestione calendario del proprio locale"
    ON calendario_giorni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 10. POLICIES: MENU (CATEGORIE, PRODOTTI, OPZIONI, MENU FISSI, PIATTI DEL GIORNO)
-- ==============================================================================
-- Categorie
CREATE POLICY "Pubblico: lettura categorie visibili"
    ON categorie_menu FOR SELECT
    TO anon, authenticated
    USING (visibile = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = categorie_menu.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Gestori: gestione categorie del proprio locale"
    ON categorie_menu FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: gestione categorie"
    ON categorie_menu FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Prodotti
CREATE POLICY "Pubblico: lettura prodotti disponibili"
    ON prodotti FOR SELECT
    TO anon, authenticated
    USING (disponibile = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = prodotti.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Gestori: gestione prodotti del proprio locale"
    ON prodotti FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: gestione prodotti"
    ON prodotti FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Gruppi Opzioni
CREATE POLICY "Pubblico: lettura gruppi opzioni"
    ON gruppi_opzioni FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = gruppi_opzioni.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Gestori: gestione gruppi opzioni del proprio locale"
    ON gruppi_opzioni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: gestione gruppi opzioni"
    ON gruppi_opzioni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Opzioni
CREATE POLICY "Pubblico: lettura opzioni disponibili"
    ON opzioni FOR SELECT
    TO anon, authenticated
    USING (disponibile = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = opzioni.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Gestori: gestione opzioni del proprio locale"
    ON opzioni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: gestione opzioni"
    ON opzioni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Menu Fissi
CREATE POLICY "Pubblico: lettura menu fissi attivi"
    ON menu_fissi FOR SELECT
    TO anon, authenticated
    USING (attivo = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = menu_fissi.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Gestori: gestione menu fissi del proprio locale"
    ON menu_fissi FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: gestione menu fissi"
    ON menu_fissi FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Slot Menu Fissi
CREATE POLICY "Pubblico: lettura slot menu fissi"
    ON menu_fissi_slot FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = menu_fissi_slot.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Gestori: gestione slot menu fissi del proprio locale"
    ON menu_fissi_slot FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: gestione slot menu fissi"
    ON menu_fissi_slot FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Piatti del Giorno
CREATE POLICY "Pubblico: lettura piatti del giorno attivi"
    ON piatti_del_giorno FOR SELECT
    TO anon, authenticated
    USING (attivo = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = piatti_del_giorno.locale_id AND locali.stato = 'attivo'));

CREATE POLICY "Gestori: gestione piatti del giorno del proprio locale"
    ON piatti_del_giorno FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: gestione piatti del giorno"
    ON piatti_del_giorno FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ==============================================================================
-- 11. POLICIES: ORDINI E RIGHE ORDINE (PROTEZIONE RIGOROSA PRIVACY)
-- ==============================================================================
-- Nessun accesso pubblico diretto (SELECT/INSERT/UPDATE) per anon!
-- Gli ordini sono creati lato server tramite route API / Server Actions protette.

CREATE POLICY "Gestori: visualizzazione ordini del proprio locale"
    ON ordini FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Gestori: aggiornamento stato ordini del proprio locale"
    ON ordini FOR UPDATE
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: visualizzazione ordini di sistema"
    ON ordini FOR SELECT
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- Righe Ordine
CREATE POLICY "Gestori: visualizzazione righe ordine del proprio locale"
    ON righe_ordine FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id));

CREATE POLICY "Super admin: visualizzazione righe ordine di sistema"
    ON righe_ordine FOR SELECT
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- ==============================================================================
-- 12. POLICIES: PLATFORM_SETTINGS
-- ==============================================================================
CREATE POLICY "Super admin: gestione completa impostazioni piattaforma"
    ON platform_settings FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));
