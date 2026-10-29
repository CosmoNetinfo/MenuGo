# MenuGo · Schema del Database (Supabase / PostgreSQL)

Questo documento descrive il modello dati e l'architettura multi-locale con isolamento RLS (Row Level Security) di **MenuGo**.

---

## 1. Architettura Multi-Tenant

Ogni tabella del database collegata a dati operativi include il campo `locale_id` (foreign key verso la tabella `locali`).

```
platform_settings         Impostazioni generali della piattaforma
locali                    Un record per locale (slug, stato, piano)
  ├─ locale_branding      Nome visibile, slogan, logo, copertina, colori
  ├─ locale_settings      Modalità (solo vetrina / vetrina + ordini), orari limite, pagamenti, contatti
  ├─ destinazioni         Punti di consegna (mense, uffici, ecc.)
  │    └─ fasce_orarie    Fasce orarie collegate a ciascuna destinazione
  ├─ calendario_giorni    Giorni con chiusure o aperture forzate
  ├─ categorie_menu       Categorie del menu (Antipasti, Primi, ecc.)
  │    └─ prodotti        Piatti e articoli con prezzi, foto e allergeni
  │         └─ gruppi_opzioni → opzioni
  ├─ menu_fissi           Schemi a slot a prezzo fisso
  │    └─ menu_fissi_slot
  ├─ piatti_del_giorno    Piatti speciali fuori menu con disponibilità temporale
  ├─ ordini               Ordini effettuati con snapshot dei dati
  │    └─ righe_ordine    Dettaglio dei prodotti ordinati
  └─ utenti_locale        Associazione gestori <-> locale
super_admins              Super amministratori della piattaforma
```

---

## 2. Principi di Sicurezza (RLS)

1. **Accesso Pubblico (Vetrina):**
   - Accesso in sola lettura (`SELECT`) ai dati pubblici dei locali attivi: branding, impostazioni pubbliche, categorie, prodotti disponibili e disponibilità oraria.
   - Nessun accesso in lettura per utenti non autenticati alla tabella `ordini` o ai dati personali dei clienti.

2. **Accesso Gestore (`/admin`):**
   - Ogni gestore autenticato appartiene a un `locale_id` tramite `utenti_locale`.
   - Le policy RLS limitano rigorosamente `SELECT`, `INSERT`, `UPDATE` e `DELETE` esclusivamente ai record appartenenti al proprio `locale_id`.

3. **Accesso Super Admin (`/super`):**
   - I super amministratori hanno visibilità globale sulle piattaforme e la gestione dei locali.

4. **Creazione Ordini:**
   - La creazione, il calcolo e la validazione degli ordini avvengono rigorosamente lato server tramite route API dedicate con verifica di disponibilità e ricalcolo prezzi.
