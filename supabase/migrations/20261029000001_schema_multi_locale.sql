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
