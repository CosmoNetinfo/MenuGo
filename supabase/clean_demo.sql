-- ==============================================================================
-- SCRIPT DI CANCELLAZIONE DATI DEMO MENUGO
-- ==============================================================================
-- Autore: Daniele Spalletti, Cosmonet.info
-- Progetto: MenuGo
-- Cancella completamente il locale 'trattoria-demo' e tutti i record collegati a cascata.
-- ==============================================================================

DELETE FROM locali
WHERE id = 'd0000000-0000-0000-0000-000000000001'
   OR slug = 'trattoria-demo';

-- Nota: Tutte le tabelle collegate (branding, settings, destinazioni, fasce,
-- categorie, prodotti, opzioni, menu fissi, ordini, righe ordine) hanno vincolo
-- ON DELETE CASCADE, pertanto verranno rimosse automaticamente.
