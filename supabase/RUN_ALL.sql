-- ==============================================================================
-- MIGRAZIONE 1: SCHEMA DEL DATABASE MULTI-LOCALE MENUGO
-- ==============================================================================
-- Autore: Daniele Spalletti, Cosmonet.info
-- Progetto: MenuGo
-- Valuta: importi sempre in centesimi (integer >= 0)
-- Fuso orario di riferimento: Europe/Rome
-- ==============================================================================

-- 1. Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Funzione per aggiornamento timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Tabella Super Amministratori
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabella Locali (Tenant radice)
CREATE TABLE IF NOT EXISTS locali (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'sospeso')),
    piano TEXT NOT NULL DEFAULT 'base',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_locali_updated_at ON locali;
CREATE TRIGGER update_locali_updated_at
    BEFORE UPDATE ON locali
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Tabella Utenti Locale (Associazione gestore/staff <-> locale)
CREATE TABLE IF NOT EXISTS utenti_locale (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ruolo TEXT NOT NULL DEFAULT 'gestore' CHECK (ruolo IN ('gestore', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT utenti_locale_unique_user_locale UNIQUE (locale_id, user_id)
);

-- 6. Tabella Locale Branding (Aspetto grafico e testi)
CREATE TABLE IF NOT EXISTS locale_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID UNIQUE NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    slogan TEXT,
    messaggio_benvenuto TEXT,
    logo_url TEXT,
    copertina_url TEXT,
    colore_primario TEXT NOT NULL DEFAULT '#16a34a',
    colore_accento TEXT NOT NULL DEFAULT '#f97316',
    colore_testo_primario TEXT NOT NULL DEFAULT '#ffffff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_locale_branding_updated_at ON locale_branding;
CREATE TRIGGER update_locale_branding_updated_at
    BEFORE UPDATE ON locale_branding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Tabella Locale Settings (Regole operative, orari limite, contatti, pagamenti)
CREATE TABLE IF NOT EXISTS locale_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID UNIQUE NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    modalita TEXT NOT NULL DEFAULT 'vetrina_ordini' CHECK (modalita IN ('solo_vetrina', 'vetrina_ordini')),
    orario_limite_ordini TIME NOT NULL DEFAULT '14:00:00',
    orario_limite_giorni_anticipo INTEGER NOT NULL DEFAULT 1 CHECK (orario_limite_giorni_anticipo >= 0),
    lunedi_chiude_sabato BOOLEAN NOT NULL DEFAULT false,
    orario_limite_annullamento TIME NOT NULL DEFAULT '09:00:00',
    accetta_contanti BOOLEAN NOT NULL DEFAULT true,
    accetta_stripe BOOLEAN NOT NULL DEFAULT false,
    commissione_carta_tipo TEXT NOT NULL DEFAULT 'nessuna' CHECK (commissione_carta_tipo IN ('nessuna', 'fissa', 'percentuale')),
    commissione_carta_valore INTEGER NOT NULL DEFAULT 0 CHECK (commissione_carta_valore >= 0),
    telefono TEXT,
    email TEXT,
    indirizzo TEXT,
    link_mappa TEXT,
    link_instagram TEXT,
    link_facebook TEXT,
    testo_ricevuta TEXT,
    testo_privacy TEXT,
    mesi_conservazione_ordini INTEGER NOT NULL DEFAULT 12 CHECK (mesi_conservazione_ordini > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_locale_settings_updated_at ON locale_settings;
CREATE TRIGGER update_locale_settings_updated_at
    BEFORE UPDATE ON locale_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Tabella Zone Consegna (per consegna a domicilio)
CREATE TABLE IF NOT EXISTS zone_consegna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    costo INTEGER NOT NULL DEFAULT 0 CHECK (costo >= 0), -- in centesimi
    attiva BOOLEAN NOT NULL DEFAULT true,
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_zone_consegna_locale_id UNIQUE (locale_id, id)
);

-- 9. Tabella Destinazioni (Punti di consegna programmata, es. aziende o mense)
CREATE TABLE IF NOT EXISTS destinazioni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    indirizzo TEXT,
    attiva BOOLEAN NOT NULL DEFAULT true,
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_destinazioni_locale_id UNIQUE (locale_id, id)
);

-- 10. Tabella Fasce Orarie (per ciascuna destinazione dello stesso locale)
CREATE TABLE IF NOT EXISTS fasce_orarie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL,
    destinazione_id UUID NOT NULL,
    ora_inizio TIME NOT NULL,
    ora_fine TIME NOT NULL,
    giorni_settimana INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 1=Lunedì .. 7=Domenica
    attiva BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fasce_orarie_congruenza CHECK (ora_fine > ora_inizio),
    CONSTRAINT fk_fasce_orarie_destinazione_locale FOREIGN KEY (locale_id, destinazione_id)
        REFERENCES destinazioni(locale_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_fasce_orarie_locale_id UNIQUE (locale_id, id)
);

-- 11. Tabella Calendario Giorni (Chiusure o aperture forzate)
CREATE TABLE IF NOT EXISTS calendario_giorni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL,
    destinazione_id UUID,
    giorno DATE NOT NULL,
    stato TEXT NOT NULL CHECK (stato IN ('aperto', 'chiuso')),
    motivo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_calendario_destinazione_locale FOREIGN KEY (locale_id, destinazione_id)
        REFERENCES destinazioni(locale_id, id) ON DELETE CASCADE
);

-- Indici unici per calendario: destinazione specifica e globale (NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendario_dest_giorno
    ON calendario_giorni(locale_id, destinazione_id, giorno)
    WHERE destinazione_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendario_globale_giorno
    ON calendario_giorni(locale_id, giorno)
    WHERE destinazione_id IS NULL;

-- 12. Tabella Categorie Menu
CREATE TABLE IF NOT EXISTS categorie_menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descrizione TEXT,
    ordine INTEGER NOT NULL DEFAULT 0,
    visibile BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categorie_menu_locale_id UNIQUE (locale_id, id)
);

-- 13. Tabella Prodotti
CREATE TABLE IF NOT EXISTS prodotti (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL,
    categoria_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descrizione TEXT,
    prezzo INTEGER NOT NULL CHECK (prezzo >= 0), -- in centesimi (es. 850 = 8,50 €)
    foto_url TEXT,
    allergeni INTEGER[] NOT NULL DEFAULT '{}', -- codici ufficiali UE (1..14)
    disponibile BOOLEAN NOT NULL DEFAULT true,
    in_evidenza BOOLEAN NOT NULL DEFAULT false,
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_prodotti_categoria_locale FOREIGN KEY (locale_id, categoria_id)
        REFERENCES categorie_menu(locale_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_prodotti_locale_id UNIQUE (locale_id, id)
);

-- 14. Tabella Gruppi Opzioni (es. Formato, Cottura, Aggiunte)
CREATE TABLE IF NOT EXISTS gruppi_opzioni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL,
    prodotto_id UUID NOT NULL,
    nome TEXT NOT NULL,
    obbligatorio BOOLEAN NOT NULL DEFAULT false,
    scelta_multipla BOOLEAN NOT NULL DEFAULT false,
    min_selezioni INTEGER NOT NULL DEFAULT 0 CHECK (min_selezioni >= 0),
    max_selezioni INTEGER CHECK (max_selezioni IS NULL OR max_selezioni >= min_selezioni),
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_gruppi_opzioni_prodotto_locale FOREIGN KEY (locale_id, prodotto_id)
        REFERENCES prodotti(locale_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_gruppi_opzioni_locale_id UNIQUE (locale_id, id)
);

-- 15. Tabella Opzioni / Varianti
CREATE TABLE IF NOT EXISTS opzioni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL,
    gruppo_id UUID NOT NULL,
    nome TEXT NOT NULL,
    prezzo_extra INTEGER NOT NULL DEFAULT 0 CHECK (prezzo_extra >= 0), -- in centesimi
    disponibile BOOLEAN NOT NULL DEFAULT true,
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_opzioni_gruppo_locale FOREIGN KEY (locale_id, gruppo_id)
        REFERENCES gruppi_opzioni(locale_id, id) ON DELETE CASCADE,
    CONSTRAINT uq_opzioni_locale_id UNIQUE (locale_id, id)
);

-- 16. Tabella Menu Fissi (Combinazioni a prezzo bloccato)
CREATE TABLE IF NOT EXISTS menu_fissi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descrizione TEXT,
    prezzo INTEGER NOT NULL CHECK (prezzo >= 0), -- in centesimi (es. 1300 = 13,00 €)
    attivo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_menu_fissi_locale_id UNIQUE (locale_id, id)
);

-- 17. Tabella Slot Menu Fissi
CREATE TABLE IF NOT EXISTS menu_fissi_slot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL,
    menu_fisso_id UUID NOT NULL,
    nome TEXT NOT NULL, -- es. "Primo", "Secondo", "Contorno"
    categoria_id UUID,
    facoltativo BOOLEAN NOT NULL DEFAULT false,
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_menu_fissi_slot_menu_locale FOREIGN KEY (locale_id, menu_fisso_id)
        REFERENCES menu_fissi(locale_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_menu_fissi_slot_categoria_locale FOREIGN KEY (locale_id, categoria_id)
        REFERENCES categorie_menu(locale_id, id) ON DELETE SET NULL,
    CONSTRAINT uq_menu_fissi_slot_locale_id UNIQUE (locale_id, id)
);

-- 18. Tabella Piatti del Giorno (Fuori menu temporanei)
CREATE TABLE IF NOT EXISTS piatti_del_giorno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descrizione TEXT,
    prezzo INTEGER NOT NULL CHECK (prezzo >= 0), -- in centesimi
    foto_url TEXT,
    allergeni INTEGER[] NOT NULL DEFAULT '{}',
    giorni_disponibilita INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
    attivo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_piatti_del_giorno_locale_id UNIQUE (locale_id, id)
);

-- 19. Tabella Ordini (con snapshot per garantire immutabilità storica)
CREATE TABLE IF NOT EXISTS ordini (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL REFERENCES locali(id) ON DELETE CASCADE,
    codice_ordine TEXT NOT NULL,
    tipo_servizio TEXT NOT NULL CHECK (tipo_servizio IN ('destinazione_programmata', 'domicilio', 'ritiro')),
    stato TEXT NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa', 'confermato', 'in_preparazione', 'completato', 'annullato')),
    stato_pagamento TEXT NOT NULL DEFAULT 'in_attesa' CHECK (stato_pagamento IN ('in_attesa', 'pagato', 'non_pagato', 'rimborsato')),
    metodo_pagamento TEXT NOT NULL CHECK (metodo_pagamento IN ('contanti', 'carta')),
    destinazione_snapshot JSONB,
    data_consegna DATE NOT NULL,
    fascia_oraria TEXT NOT NULL,
    indirizzo_consegna TEXT, -- per ordini a domicilio
    nome_cliente TEXT NOT NULL,
    cognome_cliente TEXT NOT NULL,
    telefono_cliente TEXT NOT NULL,
    note_cliente TEXT,
    totale INTEGER NOT NULL CHECK (totale >= 0), -- in centesimi
    costo_consegna INTEGER NOT NULL DEFAULT 0 CHECK (costo_consegna >= 0), -- in centesimi
    commissione_pagamento INTEGER NOT NULL DEFAULT 0 CHECK (commissione_pagamento >= 0), -- in centesimi
    stripe_payment_intent_id TEXT,
    anonimizzato BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ordini_locale_codice UNIQUE (locale_id, codice_ordine),
    CONSTRAINT uq_ordini_locale_id UNIQUE (locale_id, id)
);

DROP TRIGGER IF EXISTS update_ordini_updated_at ON ordini;
CREATE TRIGGER update_ordini_updated_at
    BEFORE UPDATE ON ordini
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 20. Tabella Righe Ordine
CREATE TABLE IF NOT EXISTS righe_ordine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_id UUID NOT NULL,
    ordine_id UUID NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('prodotto', 'menu_fisso', 'piatto_del_giorno', 'extra')),
    prodotto_id UUID,
    nome_snapshot TEXT NOT NULL,
    prezzo_unitario_snapshot INTEGER NOT NULL CHECK (prezzo_unitario_snapshot >= 0), -- in centesimi
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    opzioni_scelte_snapshot JSONB,
    totale_riga INTEGER NOT NULL CHECK (totale_riga >= 0), -- in centesimi
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_righe_ordine_ordine_locale FOREIGN KEY (locale_id, ordine_id)
        REFERENCES ordini(locale_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_righe_ordine_prodotto_locale FOREIGN KEY (locale_id, prodotto_id)
        REFERENCES prodotti(locale_id, id) ON DELETE SET NULL
);

-- 21. Tabella Platform Settings (Parametri di sistema)
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chiave TEXT UNIQUE NOT NULL,
    valore JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indici di performance
CREATE INDEX IF NOT EXISTS idx_locali_slug ON locali(slug);
CREATE INDEX IF NOT EXISTS idx_utenti_locale_user ON utenti_locale(user_id);
CREATE INDEX IF NOT EXISTS idx_utenti_locale_locale ON utenti_locale(locale_id);
CREATE INDEX IF NOT EXISTS idx_zone_consegna_locale ON zone_consegna(locale_id);
CREATE INDEX IF NOT EXISTS idx_destinazioni_locale ON destinazioni(locale_id);
CREATE INDEX IF NOT EXISTS idx_fasce_destinazione ON fasce_orarie(destinazione_id);
CREATE INDEX IF NOT EXISTS idx_calendario_locale_giorno ON calendario_giorni(locale_id, giorno);
CREATE INDEX IF NOT EXISTS idx_categorie_locale_ordine ON categorie_menu(locale_id, ordine);
CREATE INDEX IF NOT EXISTS idx_prodotti_locale_categoria ON prodotti(locale_id, categoria_id);
CREATE INDEX IF NOT EXISTS idx_ordini_locale_data ON ordini(locale_id, data_consegna);
CREATE INDEX IF NOT EXISTS idx_ordini_locale_codice ON ordini(locale_id, codice_ordine);
CREATE INDEX IF NOT EXISTS idx_righe_ordine_ordine ON righe_ordine(ordine_id);
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
ALTER TABLE zone_consegna ENABLE ROW LEVEL SECURITY;
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
DROP POLICY IF EXISTS "Super admin possono gestire tabella super_admins" ON super_admins;
CREATE POLICY "Super admin possono gestire tabella super_admins"
    ON super_admins FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ==============================================================================
-- 4. POLICIES: LOCALI
-- ==============================================================================
DROP POLICY IF EXISTS "Pubblico: lettura locali attivi" ON locali;
CREATE POLICY "Pubblico: lettura locali attivi"
    ON locali FOR SELECT
    TO anon, authenticated
    USING (stato = 'attivo');

DROP POLICY IF EXISTS "Super admin: gestione totale locali" ON locali;
CREATE POLICY "Super admin: gestione totale locali"
    ON locali FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestori: lettura del proprio locale" ON locali;
CREATE POLICY "Gestori: lettura del proprio locale"
    ON locali FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), id));

DROP POLICY IF EXISTS "Gestori: aggiornamento del proprio locale" ON locali;
CREATE POLICY "Gestori: aggiornamento del proprio locale"
    ON locali FOR UPDATE
    TO authenticated
    USING (is_gestore_of(auth.uid(), id))
    WITH CHECK (is_gestore_of(auth.uid(), id));

-- ==============================================================================
-- 5. POLICIES: UTENTI_LOCALE
-- ==============================================================================
DROP POLICY IF EXISTS "Super admin: gestione totale utenti locale" ON utenti_locale;
CREATE POLICY "Super admin: gestione totale utenti locale"
    ON utenti_locale FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Utenti: lettura delle proprie associazioni locali" ON utenti_locale;
CREATE POLICY "Utenti: lettura delle proprie associazioni locali"
    ON utenti_locale FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Gestori: lettura staff del proprio locale" ON utenti_locale;
CREATE POLICY "Gestori: lettura staff del proprio locale"
    ON utenti_locale FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 6. POLICIES: LOCALE_BRANDING
-- ==============================================================================
DROP POLICY IF EXISTS "Pubblico: lettura branding locale attivo" ON locale_branding;
CREATE POLICY "Pubblico: lettura branding locale attivo"
    ON locale_branding FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = locale_branding.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Super admin: gestione branding" ON locale_branding;
CREATE POLICY "Super admin: gestione branding"
    ON locale_branding FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestori: gestione branding del proprio locale" ON locale_branding;
CREATE POLICY "Gestori: gestione branding del proprio locale"
    ON locale_branding FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 7. POLICIES: LOCALE_SETTINGS
-- ==============================================================================
DROP POLICY IF EXISTS "Pubblico: lettura impostazioni per locali attivi" ON locale_settings;
CREATE POLICY "Pubblico: lettura impostazioni per locali attivi"
    ON locale_settings FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = locale_settings.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Super admin: gestione settings" ON locale_settings;
CREATE POLICY "Super admin: gestione settings"
    ON locale_settings FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestori: gestione settings del proprio locale" ON locale_settings;
CREATE POLICY "Gestori: gestione settings del proprio locale"
    ON locale_settings FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 8. POLICIES: ZONE CONSEGNA
-- ==============================================================================
DROP POLICY IF EXISTS "Pubblico: lettura zone consegna attive" ON zone_consegna;
CREATE POLICY "Pubblico: lettura zone consegna attive"
    ON zone_consegna FOR SELECT
    TO anon, authenticated
    USING (attiva = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = zone_consegna.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Super admin: gestione zone consegna" ON zone_consegna;
CREATE POLICY "Super admin: gestione zone consegna"
    ON zone_consegna FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestori: gestione zone consegna del proprio locale" ON zone_consegna;
CREATE POLICY "Gestori: gestione zone consegna del proprio locale"
    ON zone_consegna FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 9. POLICIES: DESTINAZIONI E FASCE ORARIE
-- ==============================================================================
DROP POLICY IF EXISTS "Pubblico: lettura destinazioni attive" ON destinazioni;
CREATE POLICY "Pubblico: lettura destinazioni attive"
    ON destinazioni FOR SELECT
    TO anon, authenticated
    USING (attiva = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = destinazioni.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Super admin: gestione destinazioni" ON destinazioni;
CREATE POLICY "Super admin: gestione destinazioni"
    ON destinazioni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestori: gestione destinazioni del proprio locale" ON destinazioni;
CREATE POLICY "Gestori: gestione destinazioni del proprio locale"
    ON destinazioni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Pubblico: lettura fasce orarie attive" ON fasce_orarie;
CREATE POLICY "Pubblico: lettura fasce orarie attive"
    ON fasce_orarie FOR SELECT
    TO anon, authenticated
    USING (attiva = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = fasce_orarie.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Super admin: gestione fasce orarie" ON fasce_orarie;
CREATE POLICY "Super admin: gestione fasce orarie"
    ON fasce_orarie FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestori: gestione fasce orarie del proprio locale" ON fasce_orarie;
CREATE POLICY "Gestori: gestione fasce orarie del proprio locale"
    ON fasce_orarie FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 10. POLICIES: CALENDARIO_GIORNI
-- ==============================================================================
DROP POLICY IF EXISTS "Pubblico: lettura calendario per locali attivi" ON calendario_giorni;
CREATE POLICY "Pubblico: lettura calendario per locali attivi"
    ON calendario_giorni FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = calendario_giorni.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Super admin: gestione calendario" ON calendario_giorni;
CREATE POLICY "Super admin: gestione calendario"
    ON calendario_giorni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestori: gestione calendario del proprio locale" ON calendario_giorni;
CREATE POLICY "Gestori: gestione calendario del proprio locale"
    ON calendario_giorni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

-- ==============================================================================
-- 11. POLICIES: MENU (CATEGORIE, PRODOTTI, OPZIONI, MENU FISSI, PIATTI DEL GIORNO)
-- ==============================================================================
-- Categorie
DROP POLICY IF EXISTS "Pubblico: lettura categorie visibili" ON categorie_menu;
CREATE POLICY "Pubblico: lettura categorie visibili"
    ON categorie_menu FOR SELECT
    TO anon, authenticated
    USING (visibile = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = categorie_menu.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Gestori: gestione categorie del proprio locale" ON categorie_menu;
CREATE POLICY "Gestori: gestione categorie del proprio locale"
    ON categorie_menu FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: gestione categorie" ON categorie_menu;
CREATE POLICY "Super admin: gestione categorie"
    ON categorie_menu FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Prodotti
DROP POLICY IF EXISTS "Pubblico: lettura prodotti disponibili" ON prodotti;
CREATE POLICY "Pubblico: lettura prodotti disponibili"
    ON prodotti FOR SELECT
    TO anon, authenticated
    USING (disponibile = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = prodotti.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Gestori: gestione prodotti del proprio locale" ON prodotti;
CREATE POLICY "Gestori: gestione prodotti del proprio locale"
    ON prodotti FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: gestione prodotti" ON prodotti;
CREATE POLICY "Super admin: gestione prodotti"
    ON prodotti FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Gruppi Opzioni
DROP POLICY IF EXISTS "Pubblico: lettura gruppi opzioni" ON gruppi_opzioni;
CREATE POLICY "Pubblico: lettura gruppi opzioni"
    ON gruppi_opzioni FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = gruppi_opzioni.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Gestori: gestione gruppi opzioni del proprio locale" ON gruppi_opzioni;
CREATE POLICY "Gestori: gestione gruppi opzioni del proprio locale"
    ON gruppi_opzioni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: gestione gruppi opzioni" ON gruppi_opzioni;
CREATE POLICY "Super admin: gestione gruppi opzioni"
    ON gruppi_opzioni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Opzioni
DROP POLICY IF EXISTS "Pubblico: lettura opzioni disponibili" ON opzioni;
CREATE POLICY "Pubblico: lettura opzioni disponibili"
    ON opzioni FOR SELECT
    TO anon, authenticated
    USING (disponibile = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = opzioni.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Gestori: gestione opzioni del proprio locale" ON opzioni;
CREATE POLICY "Gestori: gestione opzioni del proprio locale"
    ON opzioni FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: gestione opzioni" ON opzioni;
CREATE POLICY "Super admin: gestione opzioni"
    ON opzioni FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Menu Fissi
DROP POLICY IF EXISTS "Pubblico: lettura menu fissi attivi" ON menu_fissi;
CREATE POLICY "Pubblico: lettura menu fissi attivi"
    ON menu_fissi FOR SELECT
    TO anon, authenticated
    USING (attivo = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = menu_fissi.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Gestori: gestione menu fissi del proprio locale" ON menu_fissi;
CREATE POLICY "Gestori: gestione menu fissi del proprio locale"
    ON menu_fissi FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: gestione menu fissi" ON menu_fissi;
CREATE POLICY "Super admin: gestione menu fissi"
    ON menu_fissi FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Slot Menu Fissi
DROP POLICY IF EXISTS "Pubblico: lettura slot menu fissi" ON menu_fissi_slot;
CREATE POLICY "Pubblico: lettura slot menu fissi"
    ON menu_fissi_slot FOR SELECT
    TO anon, authenticated
    USING (EXISTS (SELECT 1 FROM locali WHERE locali.id = menu_fissi_slot.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Gestori: gestione slot menu fissi del proprio locale" ON menu_fissi_slot;
CREATE POLICY "Gestori: gestione slot menu fissi del proprio locale"
    ON menu_fissi_slot FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: gestione slot menu fissi" ON menu_fissi_slot;
CREATE POLICY "Super admin: gestione slot menu fissi"
    ON menu_fissi_slot FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Piatti del Giorno
DROP POLICY IF EXISTS "Pubblico: lettura piatti del giorno attivi" ON piatti_del_giorno;
CREATE POLICY "Pubblico: lettura piatti del giorno attivi"
    ON piatti_del_giorno FOR SELECT
    TO anon, authenticated
    USING (attivo = true AND EXISTS (SELECT 1 FROM locali WHERE locali.id = piatti_del_giorno.locale_id AND locali.stato = 'attivo'));

DROP POLICY IF EXISTS "Gestori: gestione piatti del giorno del proprio locale" ON piatti_del_giorno;
CREATE POLICY "Gestori: gestione piatti del giorno del proprio locale"
    ON piatti_del_giorno FOR ALL
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: gestione piatti del giorno" ON piatti_del_giorno;
CREATE POLICY "Super admin: gestione piatti del giorno"
    ON piatti_del_giorno FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- ==============================================================================
-- 12. POLICIES: ORDINI E RIGHE ORDINE
-- ==============================================================================
DROP POLICY IF EXISTS "Gestori: visualizzazione ordini del proprio locale" ON ordini;
CREATE POLICY "Gestori: visualizzazione ordini del proprio locale"
    ON ordini FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Gestori: aggiornamento stato ordini del proprio locale" ON ordini;
CREATE POLICY "Gestori: aggiornamento stato ordini del proprio locale"
    ON ordini FOR UPDATE
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id))
    WITH CHECK (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: visualizzazione ordini di sistema" ON ordini;
CREATE POLICY "Super admin: visualizzazione ordini di sistema"
    ON ordini FOR SELECT
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- Righe Ordine
DROP POLICY IF EXISTS "Gestori: visualizzazione righe ordine del proprio locale" ON righe_ordine;
CREATE POLICY "Gestori: visualizzazione righe ordine del proprio locale"
    ON righe_ordine FOR SELECT
    TO authenticated
    USING (is_gestore_of(auth.uid(), locale_id));

DROP POLICY IF EXISTS "Super admin: visualizzazione righe ordine di sistema" ON righe_ordine;
CREATE POLICY "Super admin: visualizzazione righe ordine di sistema"
    ON righe_ordine FOR SELECT
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- ==============================================================================
-- 13. POLICIES: PLATFORM_SETTINGS
-- ==============================================================================
DROP POLICY IF EXISTS "Super admin: gestione completa impostazioni piattaforma" ON platform_settings;
CREATE POLICY "Super admin: gestione completa impostazioni piattaforma"
    ON platform_settings FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));
-- ==============================================================================
-- MIGRAZIONE 3: STORAGE BUCKET E REGOLE DI SICUREZZA PER MEDIA
-- ==============================================================================
-- Autore: Daniele Spalletti, Cosmonet.info
-- Progetto: MenuGo
-- Solo formati raster sicuri: PNG, JPG e WebP (escluso SVG per sicurezza XSS)
-- ==============================================================================

-- 1. Creazione / Aggiornamento del bucket per loghi, copertine e foto dei piatti
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'locali-media',
    'locali-media',
    true,
    5242880, -- 5 MB massimo per immagine
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Policy di lettura pubblica per i media del bucket
DROP POLICY IF EXISTS "Accesso pubblico in lettura ai media dei locali" ON storage.objects;
CREATE POLICY "Accesso pubblico in lettura ai media dei locali"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'locali-media');

-- 3. Policy di caricamento per gestori autenticati e super admin
-- I file sono organizzati per cartella: locali-media/<locale_id>/<file>
DROP POLICY IF EXISTS "Gestori possono caricare file nella cartella del proprio locale" ON storage.objects;
CREATE POLICY "Gestori possono caricare file nella cartella del proprio locale"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'locali-media' AND (
            is_super_admin(auth.uid()) OR
            is_gestore_of(auth.uid(), (storage.foldername(name))[1]::uuid)
        )
    );

-- 4. Policy di modifica e rimozione
DROP POLICY IF EXISTS "Gestori possono modificare ed eliminare i file del proprio locale" ON storage.objects;
CREATE POLICY "Gestori possono modificare ed eliminare i file del proprio locale"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'locali-media' AND (
            is_super_admin(auth.uid()) OR
            is_gestore_of(auth.uid(), (storage.foldername(name))[1]::uuid)
        )
    );

DROP POLICY IF EXISTS "Gestori possono cancellare i file del proprio locale" ON storage.objects;
CREATE POLICY "Gestori possono cancellare i file del proprio locale"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'locali-media' AND (
            is_super_admin(auth.uid()) OR
            is_gestore_of(auth.uid(), (storage.foldername(name))[1]::uuid)
        )
    );
-- ==============================================================================
-- MENUGO: SEED DATI DEMO PER IL LOCALE "TRATTORIA DEMO"
-- ==============================================================================
-- Autore: Daniele Spalletti, Cosmonet.info
-- Progetto: MenuGo
-- Solo dati fittizi conformi alle regole di privacy e portfolio.
-- Importi sempre in centesimi (integer >= 0).
-- ==============================================================================

DO $$
DECLARE
    v_locale_id UUID := 'd0000000-0000-0000-0000-000000000001';
    v_cat_antipasti UUID := 'ca000000-0000-0000-0000-000000000001';
    v_cat_primi UUID := 'ca000000-0000-0000-0000-000000000002';
    v_cat_secondi UUID := 'ca000000-0000-0000-0000-000000000003';
    v_cat_contorni UUID := 'ca000000-0000-0000-0000-000000000004';
    v_cat_bevande UUID := 'ca000000-0000-0000-0000-000000000005';
    v_cat_dolci UUID := 'ca000000-0000-0000-0000-000000000006';

    v_dest_alfa UUID := 'de000000-0000-0000-0000-000000000001';
    v_dest_beta UUID := 'de000000-0000-0000-0000-000000000002';

    v_zona_centro UUID := 'ba000000-0000-0000-0000-000000000001';

    v_prod_tagliatelle UUID := 'da000000-0000-0000-0000-000000000005';
    v_grp_formato UUID := 'ea000000-0000-0000-0000-000000000001';

    v_menu_fisso UUID := 'ee000000-0000-0000-0000-000000000001';
    v_ordine_id UUID;
    i INTEGER;
BEGIN
    -- 1. Locale
    INSERT INTO locali (id, slug, stato, piano)
    VALUES (v_locale_id, 'trattoria-demo', 'attivo', 'pro')
    ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, stato = EXCLUDED.stato;

    -- 2. Branding
    INSERT INTO locale_branding (locale_id, nome, slogan, messaggio_benvenuto, logo_url, copertina_url, colore_primario, colore_accento, colore_testo_primario)
    VALUES (
        v_locale_id,
        'Trattoria Demo',
        'Cucina tradizionale italiana e piatti freschi del giorno',
        'Benvenuti alla Trattoria Demo! Ordina comodamente online e ricevi il tuo pranzo direttamente in sede o ritiralo caldo.',
        '/demo/placeholder-logo.png',
        '/demo/placeholder-cover.webp',
        '#059669', -- emerald-600
        '#ea580c', -- orange-600
        '#ffffff'
    )
    ON CONFLICT (locale_id) DO UPDATE SET nome = EXCLUDED.nome;

    -- 3. Impostazioni
    INSERT INTO locale_settings (
        locale_id, modalita, orario_limite_ordini, orario_limite_giorni_anticipo,
        lunedi_chiude_sabato, orario_limite_annullamento, accetta_contanti, accetta_stripe,
        telefono, email, indirizzo, link_mappa, testo_ricevuta, testo_privacy
    )
    VALUES (
        v_locale_id, 'vetrina_ordini', '14:00:00', 1,
        false, '09:00:00', true, false,
        '+39 02 0000 0000', 'info@trattoriademo.example.com', 'Via delle Vigne 15, Milano (MI)',
        'https://maps.google.com/?q=Trattoria+Demo',
        'Grazie per il tuo ordine da Trattoria Demo! Mostra questo riepilogo al momento della consegna.',
        'Trattiamo i tuoi dati esclusivamente per la gestione dell''ordine secondo il regolamento GDPR.'
    )
    ON CONFLICT (locale_id) DO UPDATE SET modalita = EXCLUDED.modalita;

    -- 4. Zone consegna a domicilio
    INSERT INTO zone_consegna (id, locale_id, nome, costo, attiva, ordine)
    VALUES (v_zona_centro, v_locale_id, 'Centro e zone limitrofe', 250, true, 1) -- 2,50 €
    ON CONFLICT (id) DO NOTHING;

    -- 5. Destinazioni programmate (2 punti di consegna aziendale)
    INSERT INTO destinazioni (id, locale_id, nome, indirizzo, attiva, ordine)
    VALUES 
        (v_dest_alfa, v_locale_id, 'Sede Aziendale Nexus Tech', 'Via dell''Innovazione 12, Edificio B', true, 1),
        (v_dest_beta, v_locale_id, 'Polo Direzionale Galileo', 'Corso Europa 45, Reception Centrale', true, 2)
    ON CONFLICT (id) DO NOTHING;

    -- 6. Fasce orarie (3 per ciascuna destinazione)
    INSERT INTO fasce_orarie (id, locale_id, destinazione_id, ora_inizio, ora_fine, giorni_settimana, attiva)
    VALUES
        ('fa000000-0000-0000-0000-000000000001', v_locale_id, v_dest_alfa, '12:00:00', '12:30:00', '{1,2,3,4,5}', true),
        ('fa000000-0000-0000-0000-000000000002', v_locale_id, v_dest_alfa, '12:30:00', '13:00:00', '{1,2,3,4,5}', true),
        ('fa000000-0000-0000-0000-000000000003', v_locale_id, v_dest_alfa, '13:00:00', '13:30:00', '{1,2,3,4,5}', true),
        ('fa000000-0000-0000-0000-000000000004', v_locale_id, v_dest_beta, '12:15:00', '12:45:00', '{1,2,3,4,5}', true),
        ('fa000000-0000-0000-0000-000000000005', v_locale_id, v_dest_beta, '12:45:00', '13:15:00', '{1,2,3,4,5}', true),
        ('fa000000-0000-0000-0000-000000000006', v_locale_id, v_dest_beta, '13:15:00', '13:45:00', '{1,2,3,4,5}', true)
    ON CONFLICT (id) DO NOTHING;

    -- 7. Categorie Menu (6)
    INSERT INTO categorie_menu (id, locale_id, nome, descrizione, ordine, visibile)
    VALUES
        (v_cat_antipasti, v_locale_id, 'Antipasti', 'Sfiziosità e taglieri preparati con prodotti freschi', 1, true),
        (v_cat_primi, v_locale_id, 'Primi Piatti', 'Paste fresche, risotti e vellutate della tradizione', 2, true),
        (v_cat_secondi, v_locale_id, 'Secondi Piatti', 'Carni scelte e proposte vegetariane di stagione', 3, true),
        (v_cat_contorni, v_locale_id, 'Contorni', 'Verdure di stagione cotte e fresche', 4, true),
        (v_cat_bevande, v_locale_id, 'Bevande', 'Acqua, bibite analcoliche e birre artigianali', 5, true),
        (v_cat_dolci, v_locale_id, 'Dolci Artigianali', 'Dessert fatti in casa ogni mattina', 6, true)
    ON CONFLICT (id) DO NOTHING;

    -- 8. Prodotti (18 piatti con prezzi in centesimi)
    INSERT INTO prodotti (id, locale_id, categoria_id, nome, descrizione, prezzo, foto_url, allergeni, disponibile, in_evidenza, ordine)
    VALUES
        -- Antipasti
        ('da000000-0000-0000-0000-000000000001', v_locale_id, v_cat_antipasti, 'Bruschette al Pomodoro e Basilico', 'Pane casereccio tostato con pomodoro fresco, aglio ed olio EVO', 500, '/demo/bruschette.jpg', '{1}', true, false, 1),
        ('da000000-0000-0000-0000-000000000002', v_locale_id, v_cat_antipasti, 'Tagliere Vegetariano di Stagione', 'Verdure grigliate, tomini caldi e crostoni di segale', 800, '/demo/tagliere-veg.jpg', '{1,7}', true, true, 2),
        ('da000000-0000-0000-0000-000000000003', v_locale_id, v_cat_antipasti, 'Tortino Morbido di Zucchine e Ricotta', 'Servito con crema al parmigiano e granella di noci', 650, '/demo/tortino-zucchine.jpg', '{3,7,8}', true, false, 3),

        -- Primi
        ('da000000-0000-0000-0000-000000000004', v_locale_id, v_cat_primi, 'Risotto Zafferano e Funghi Porcini', 'Riso Carnaroli mantecato al burro d''alpeggio e parmigiano', 1050, '/demo/risotto.jpg', '{7}', true, true, 1),
        (v_prod_tagliatelle, v_locale_id, v_cat_primi, 'Tagliatelle Fresche al Ragù Tradizionale', 'Pasta all''uovo tirata a mano con ragù a lenta cottura', 950, '/demo/tagliatelle.jpg', '{1,3,9}', true, true, 2),
        ('da000000-0000-0000-0000-000000000006', v_locale_id, v_cat_primi, 'Gnocchi di Patate al Pesto di Basilico', 'Pesto genovese fresco con pinoli e scaglie di pecorino', 900, '/demo/gnocchi.jpg', '{1,7,8}', true, false, 3),
        ('da000000-0000-0000-0000-000000000007', v_locale_id, v_cat_primi, 'Vellutata di Ceci e Rosmarino', 'Servita tiepida con crostini di pane integrale aromatizzati', 800, '/demo/vellutata.jpg', '{1}', true, false, 4),

        -- Secondi
        ('da000000-0000-0000-0000-000000000008', v_locale_id, v_cat_secondi, 'Arrosto di Vitello alle Erbe con Salsa al Vino', 'Fette tenere di vitello cotto al forno con fondo bruno', 1200, '/demo/arrosto.jpg', '{9,12}', true, true, 1),
        ('da000000-0000-0000-0000-000000000009', v_locale_id, v_cat_secondi, 'Polpette Tradizionali al Sugo Fresco', 'Morbide polpette al sugo di pomodori dolci e prezzemolo', 950, '/demo/polpette.jpg', '{1,3,7}', true, false, 2),
        ('da000000-0000-0000-0000-000000000010', v_locale_id, v_cat_secondi, 'Filetto di Orata Gratinata alle Mandorle', 'Cottura al vapore e crosta croccante di mandorle tostate', 1300, '/demo/orata.jpg', '{4,8}', true, false, 3),
        ('da000000-0000-0000-0000-000000000011', v_locale_id, v_cat_secondi, 'Burger Veg di Lenticchie e Quinoa', 'Con maionese alla senape e insalatina croccante', 900, '/demo/burger-veg.jpg', '{1,10}', true, false, 4),

        -- Contorni
        ('da000000-0000-0000-0000-000000000012', v_locale_id, v_cat_contorni, 'Patate Novelle al Forno con Rosmarino', 'Dorate e croccanti condite con sale marino ed erbette', 400, '/demo/patate.jpg', '{}', true, false, 1),
        ('da000000-0000-0000-0000-000000000013', v_locale_id, v_cat_contorni, 'Insalata Mista di Stagione', 'Misticanza, carote julienne, pomodorini e semi tostati', 350, '/demo/insalata.jpg', '{}', true, false, 2),
        ('da000000-0000-0000-0000-000000000014', v_locale_id, v_cat_contorni, 'Bietole Saltate con Olio ed Aglio Dolce', 'Verdure a foglia verde saltate in padella', 400, '/demo/bietole.jpg', '{}', true, false, 3),

        -- Bevande
        ('da000000-0000-0000-0000-000000000015', v_locale_id, v_cat_bevande, 'Acqua Minerale 50cl', 'Naturale o Frizzante in bottiglia eco', 150, '/demo/acqua.webp', '{}', true, false, 1),
        ('da000000-0000-0000-0000-000000000016', v_locale_id, v_cat_bevande, 'Limonata Biologica San Pellegrino 33cl', 'Bibita fresca agli agrumi italiani', 300, '/demo/bibita.webp', '{}', true, false, 2),
        ('da000000-0000-0000-0000-000000000017', v_locale_id, v_cat_bevande, 'Birra Artigianale Bionda 33cl', 'Birra artigianale a bassa fermentazione, note fresche di malto', 450, '/demo/birra.webp', '{1}', true, false, 3),

        -- Dolci
        ('da000000-0000-0000-0000-000000000018', v_locale_id, v_cat_dolci, 'Tiramisù Tradizionale al Mascarpone', 'Savoiardi artigianali bagnati nel caffè e crema al mascarpone', 500, '/demo/tiramisu.jpg', '{1,3,7}', true, true, 1)
    ON CONFLICT (id) DO NOTHING;

    -- 9. Opzioni per le Tagliatelle
    INSERT INTO gruppi_opzioni (id, locale_id, prodotto_id, nome, obbligatorio, scelta_multipla, min_selezioni, max_selezioni, ordine)
    VALUES (v_grp_formato, v_locale_id, v_prod_tagliatelle, 'Porzione e aggiunte', false, false, 0, 1, 1)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO opzioni (id, locale_id, gruppo_id, nome, prezzo_extra, disponibile, ordine)
    VALUES
        ('aa000000-0000-0000-0000-000000000001', v_locale_id, v_grp_formato, 'Porzione Normale', 0, true, 1),
        ('aa000000-0000-0000-0000-000000000002', v_locale_id, v_grp_formato, 'Porzione Abbondante (+30%)', 200, true, 2)
    ON CONFLICT (id) DO NOTHING;

    -- 10. Menu Fisso "Menu Pranzo Business" (13,00 € = 1300 centesimi)
    INSERT INTO menu_fissi (id, locale_id, nome, descrizione, prezzo, attivo)
    VALUES (v_menu_fisso, v_locale_id, 'Menu Pranzo Business', 'Un primo + un contorno + acqua 50cl compresa nel prezzo', 1300, true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO menu_fissi_slot (id, locale_id, menu_fisso_id, nome, categoria_id, facoltativo, ordine)
    VALUES
        ('ec000000-0000-0000-0000-000000000001', v_locale_id, v_menu_fisso, 'Primo Piatto a scelta', v_cat_primi, false, 1),
        ('ec000000-0000-0000-0000-000000000002', v_locale_id, v_menu_fisso, 'Contorno a scelta', v_cat_contorni, false, 2),
        ('ec000000-0000-0000-0000-000000000003', v_locale_id, v_menu_fisso, 'Bevanda inclusa', v_cat_bevande, false, 3)
    ON CONFLICT (id) DO NOTHING;

    -- 11. Piatto del Giorno
    INSERT INTO piatti_del_giorno (id, locale_id, nome, descrizione, prezzo, foto_url, allergeni, giorni_disponibilita, attivo)
    VALUES (
        'ef000000-0000-0000-0000-000000000001',
        v_locale_id,
        'Couscous Mediterraneo con Verdure Caramellate',
        'Specialità del giorno servita con ceci tostati e menta fresca',
        850, -- 8,50 €
        '/demo/couscous.webp',
        '{1}',
        '{1,2,3,4,5}',
        true
    )
    ON CONFLICT (id) DO NOTHING;

    -- 12. Generazione di 16 Ordini Demo fittizi
    FOR i IN 1..16 LOOP
        v_ordine_id := gen_random_uuid();

        INSERT INTO ordini (
            id, locale_id, codice_ordine, tipo_servizio, stato, stato_pagamento, metodo_pagamento,
            destinazione_snapshot, data_consegna, fascia_oraria, indirizzo_consegna,
            nome_cliente, cognome_cliente, telefono_cliente, note_cliente,
            totale, costo_consegna, commissione_pagamento, created_at
        )
        VALUES (
            v_ordine_id,
            v_locale_id,
            'ORD-DEMO-' || LPAD(i::text, 4, '0'),
            CASE WHEN i % 4 = 0 THEN 'domicilio' ELSE 'destinazione_programmata' END,
            CASE 
                WHEN i <= 4 THEN 'in_attesa'
                WHEN i <= 9 THEN 'confermato'
                WHEN i <= 14 THEN 'completato'
                ELSE 'annullato'
            END,
            CASE 
                WHEN i <= 12 THEN 'pagato'
                WHEN i <= 14 THEN 'in_attesa'
                ELSE 'rimborsato'
            END,
            'contanti',
            CASE 
                WHEN i % 4 = 0 THEN NULL
                ELSE jsonb_build_object(
                    'nome', 'Sede Aziendale Nexus Tech',
                    'indirizzo', 'Via dell''Innovazione 12, Edificio B'
                )
            END,
            CURRENT_DATE + ((i % 3) || ' days')::interval,
            '12:30:00 - 13:00:00',
            CASE WHEN i % 4 = 0 THEN 'Via Monte Rosa 24, Milano' ELSE NULL END,
            'ClienteDemo' || i,
            'Test',
            '+39 333 00000' || LPAD(i::text, 2, '0'),
            CASE WHEN i % 3 = 0 THEN 'Senza posate monouso per favore' ELSE NULL END,
            1350, -- 13,50 €
            CASE WHEN i % 4 = 0 THEN 250 ELSE 0 END, -- 2,50 € consegna a domicilio
            0,
            NOW() - ((16 - i) || ' hours')::interval
        );

        -- Righe ordine collegate
        INSERT INTO righe_ordine (
            ordine_id, locale_id, tipo, prodotto_id, nome_snapshot, prezzo_unitario_snapshot, quantita, totale_riga
        )
        VALUES (
            v_ordine_id,
            v_locale_id,
            'prodotto',
            v_prod_tagliatelle,
            'Tagliatelle Fresche al Ragù Tradizionale',
            950,
            1,
            950
        );

        INSERT INTO righe_ordine (
            ordine_id, locale_id, tipo, prodotto_id, nome_snapshot, prezzo_unitario_snapshot, quantita, totale_riga
        )
        VALUES (
            v_ordine_id,
            v_locale_id,
            'prodotto',
            'da000000-0000-0000-0000-000000000012',
            'Patate Novelle al Forno con Rosmarino',
            400,
            1,
            400
        );
    END LOOP;

END $$;
