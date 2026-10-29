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
