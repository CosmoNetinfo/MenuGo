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
