# BRIEF: MenuGo, vetrina e ordini online per ristoranti (NUOVO repository)

> Salva questo file nel nuovo repository come `docs/BRIEF.md`.
> Per ogni fase dai ad Antigravity solo questa istruzione: **"Leggi docs/BRIEF.md ed esegui SOLO la Fase N."**
> Autore e proprietario del progetto: Daniele Spalletti, Cosmonet.info (GitHub: CosmoNetinfo).

---

## 0. Regole di lavoro (leggere per prime)

1. **Repository completamente nuovo.** Il repository `MenuGo` è già stato creato (vuoto) dal proprietario. Non è un ramo di un altro progetto e non deve contenere codice, file, cronologia, dati, loghi o immagini di app precedenti. Si parte da zero con `create-next-app`. Non copiare nulla da altri repository.
2. **Progetti nuovi e separati.** Nuovo progetto Supabase e nuovo progetto Vercel dedicati a MenuGo. Nessuna chiave o dato condiviso con altri progetti.
3. **Nessun dato reale di terzi.** Solo dati demo inventati: un ristorante di fantasia ("Trattoria Demo"), logo e foto generati o segnaposto liberi da diritti. Mai nomi, telefoni, email, P.IVA o indirizzi reali.
4. **Niente valori scritti nel codice.** Tutto ciò che il cliente vede (nome, logo, colori, testi, orari, giorni, prezzi, menu, foto) sta nel database ed è modificabile dal pannello. L'unica cosa fissa è il nome del prodotto "MenuGo" in `src/config/brand.ts`.
5. **Prezzi e regole orarie sempre calcolati lato server.** Il browser mostra solo un'anteprima.
6. **Una fase alla volta.** Alla fine di ogni fase: elenco dei file creati/modificati, SQL da eseguire su Supabase, come testare, cosa è ancora scritto nel codice.
7. Interfaccia in **italiano**. Importi in formato italiano (`15,00 €`), date con il mese minuscolo (`martedì 6 ottobre`), fuso **Europe/Rome**, importi salvati in **centesimi (integer)**.
8. **Repository adatto al portfolio:** codice ordinato, commit chiari in italiano, README curato, nessun segreto nel repository (vedi sezione 12).

---

## 1. Cos'è MenuGo

**MenuGo** è una web app (PWA) per **qualsiasi locale di ristorazione** (ristorante, pizzeria, rosticceria, mensa, bar, catering). Ogni locale ottiene la **sua vetrina online**, con il proprio nome, logo, colori, foto e menu, tutto modificabile da solo, senza saper programmare. Sulla vetrina i clienti possono anche **ordinare**.

Idea in una frase: *"Il ristoratore entra nel pannello, carica logo, foto e menu, e in pochi minuti ha una vetrina e un sistema di ordini tutto suo."*

"MenuGo" è il nome del prodotto. Il **nome che i clienti vedono** è invece quello del locale ("Trattoria Da Mario"), modificabile in qualsiasi momento.

### Due modalità, scelte da ogni locale
- **Solo vetrina:** il menu è visibile con foto e prezzi, ma non si ordina (utile per chi vuole solo mostrarsi).
- **Vetrina + ordini:** il cliente può ordinare, per consegna o per ritiro.
Il gestore le cambia con un interruttore nelle impostazioni.

### Ruoli
- **Super admin** (il proprietario della piattaforma): crea e gestisce i locali.
- **Gestore** (il ristoratore): gestisce vetrina, menu, ordini e impostazioni del SUO locale.
- **Cliente finale:** guarda il menu e ordina senza registrazione (nome, cognome, telefono).

---

## 2. Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase**: Postgres, Auth (solo super admin e gestori), **Storage** (loghi e foto), Row Level Security
- **Stripe** (opzionale, attivabile per locale)
- **PWA** con manifest dinamico per locale
- Deploy su **Vercel**
- Test automatici (Vitest) per prezzi, regole orarie e isolamento tra locali

---

## 3. Indirizzi dell'app

- Vetrina e ordini del locale: `/{slug}` (es. `/trattoria-demo`).
- Pannello del gestore: `/admin` (login; ogni gestore vede solo il suo locale).
- Pannello del super admin: `/super` (login separato).
- Pagina iniziale `/`: presentazione semplice di MenuGo con un link alla demo (serve anche come vetrina per il portfolio).
- Lo `slug` si genera dal nome, è univoco e modificabile (con avviso che il vecchio link smette di funzionare). Predisporre, senza implementarlo ora, il collegamento di un dominio proprio per locale.

---

## 4. Modifica totale da parte del cliente (cuore del progetto)

Il gestore, dal pannello, può modificare **tutto** quello che i clienti vedono:

1. **Nome visibile del locale**, slogan e messaggio di benvenuto.
2. **Logo:** upload da pannello (PNG, JPG, SVG). Il sistema lo salva su Storage (mai in Base64 nel database), lo ottimizza, offre "Rimuovi sfondo bianco", mostra un'anteprima su sfondo chiaro e scuro.
3. **Copertina/banner** della vetrina (immagine opzionale).
4. **Colori:** colore principale e di accento da selettore. L'interfaccia usa variabili CSS e **controlla il contrasto** del testo; se non è leggibile, avvisa e propone un'alternativa.
5. **Menu:** categorie, piatti, descrizioni, prezzi, allergeni, disponibilità, **foto di ogni piatto** (upload con ridimensionamento automatico), ordine di visualizzazione per trascinamento.
6. **Orari di apertura**, indirizzo, telefono, email, link social, mappa (solo link), testi legali.
7. **Testi:** messaggio di benvenuto, avviso orari, testo in fondo alla ricevuta.
8. **Lingua e formato** restano italiani; predisporre i testi in modo da poter aggiungere altre lingue in futuro.

Ogni modifica si vede **subito** sulla vetrina (nessuna ripubblicazione). Se manca il logo, appare il nome in testo; se manca la foto di un piatto, appare un segnaposto elegante.

Tema di partenza neutro e moderno (non legato a nessun cliente).

---

## 5. Menu

- **Categorie libere** (Antipasti, Pizze, Primi, Bevande...) con ordine e visibilità.
- **Prodotti:** nome, descrizione, foto, prezzo, allergeni (elenco standard dei 14 allergeni UE, da spuntare), disponibile sì/no, "piatto in evidenza".
- **Opzioni e varianti** (gruppi di scelta singola o multipla, obbligatorie o facoltative, con prezzo extra): formato, cottura, aggiunte, senza ingredienti.
- **Menu fissi (combinazioni a prezzo fisso):** il gestore compone uno schema a "slot" (es. un primo + un secondo + un contorno = 13,00 €), anche con slot facoltativi. Il server riconosce lo schema dalle scelte del cliente e applica il prezzo dello schema.
- **Extra** (es. bibita) con prezzo modificabile da pannello.
- **Piatto del giorno / fuori menu:** nome, foto, prezzo, giorni di disponibilità.
- Funzione di calcolo del totale **unica**, usata in anteprima e sul server, con test su tutti i casi (menu fisso valido/non valido, extra, prodotti singoli, opzioni a pagamento, piatto del giorno).
- Importazione rapida del menu da **file CSV** (opzionale, in fase finale).

---

## 6. Ordini

Il gestore sceglie il tipo di servizio, anche più di uno:
- **Consegna a destinazioni programmate** (azienda, mensa, ufficio): *Destinazione → Orario → Giorno → Menu → Riepilogo → Pagamento*.
- **Consegna a domicilio** (indirizzo scritto dal cliente, zone e costo consegna configurabili).
- **Ritiro in locale** (fascia oraria di ritiro).

Regole, tutte configurabili per locale:
- Orario limite ordini (es. 14:00 del giorno prima; opzione "il lunedì chiude il sabato").
- Orario limite annullamento (es. 09:00 del giorno di consegna).
- Modifica ordine fino all'orario limite (solo contanti; per la carta si annulla con rimborso).
- Giorni e fasce orarie **per destinazione**.
- **Calendario aperto/chiuso:** ogni giorno è *Automatico*, *Aperto* (forzato) o *Chiuso* (forzato), con motivo facoltativo, valido per tutte le destinazioni o per una. "Aperto" non scavalca l'orario limite. Chiudendo un giorno con ordini già fatti, avviso con elenco e conferma.
- **Disponibilità dinamica:** giorni, orari e stati sono SEMPRE letti dal database (`/api/availability`), senza elenchi fissi e con cache disattivata dove serve (`dynamic = 'force-dynamic'`).
- **Controlli lato server** su creazione, modifica e annullamento (orario limite, giorno aperto, destinazione e fascia valide, prezzo ricalcolato).
- **Snapshot** nell'ordine di destinazione, orario, nomi e prezzi: le modifiche successive non alterano gli ordini vecchi.
- Disattivare orari o destinazioni con ordini collegati: non si cancella, si disattiva con avviso "Ci sono N ordini collegati".
- Il cliente riceve una **conferma/ricevuta in app** (non è un documento fiscale) e può rivedere "I miei ordini" sullo stesso dispositivo.

---

## 7. Pagamenti

- **Contanti alla consegna/ritiro:** attivabile per locale; il gestore segna "contanti ricevuti".
- **Carta (Stripe):** spenta di default; si attiva solo se il locale inserisce le proprie chiavi Stripe, salvate in modo sicuro lato server (mai nel browser né nei log). Senza chiavi l'app funziona in solo contanti, senza errori.
- **Commissione carta:** `nessuna | fissa | percentuale`, spenta di default. Avviso nel pannello: *"In Italia, in generale, non sono ammessi supplementi sui pagamenti con carte di consumatori: verifica con il tuo commercialista prima di attivarla."*
- Webhook Stripe con verifica della firma e idempotenza; rimborso automatico in caso di annullamento.

---

## 8. Pannello del gestore (`/admin`, usabile bene da telefono)

1. **Dashboard:** ordini del giorno, cosa preparare (porzioni per prodotto, per destinazione e orario), incasso previsto/pagato/da riscuotere.
2. **Ordini:** lista con filtri; azioni "contanti ricevuti", annulla, "non pagato"; vista stampabile per la cucina.
3. **Vetrina e aspetto:** nome, logo, copertina, colori, testi (sezione 4).
4. **Menu:** categorie, prodotti, foto, opzioni, menu fissi, extra, piatto del giorno.
5. **Servizio:** interruttore solo vetrina / vetrina + ordini, destinazioni, orari, zone di consegna, ritiro.
6. **Calendario** aperto/chiuso.
7. **Impostazioni:** regole orarie, pagamenti, commissione, dati legali, privacy.

---

## 9. Pannello del super admin (`/super`)

- Elenco dei locali con stato (attivo/sospeso), link, numero ordini.
- **Crea nuovo locale:** nome, slug, email del gestore. Il gestore riceve un invito per impostare la password e trova la vetrina già pronta, con menu di esempio opzionale.
- Sospendere/riattivare un locale (la vetrina mostra "Servizio temporaneamente non disponibile").
- Campo "piano" (semplice etichetta, nessun incasso automatico in questa versione).
- Reimpostare l'accesso di un gestore. Nessun accesso ai dati personali dei clienti finali, se non per assistenza.

---

## 10. Modello dati (indicativo)

```
platform_settings         impostazioni generali della piattaforma
locali                    un record per locale (slug, stato, piano)
  ├─ locale_branding      nome visibile, slogan, logo, copertina, colori
  ├─ locale_settings      modalità (vetrina/ordini), regole orarie, pagamenti, dati legali, contatti
  ├─ destinazioni         punti di consegna
  │    └─ fasce_orarie
  ├─ calendario_giorni    aperto/chiuso forzati
  ├─ categorie_menu
  │    └─ prodotti → gruppi_opzioni → opzioni
  ├─ menu_fissi → slot
  ├─ piatti_del_giorno
  ├─ ordini → righe_ordine   (con snapshot)
  └─ utenti_locale        gestori del locale
super_admins
```

Ogni tabella operativa ha `locale_id` e RLS. Il pubblico legge solo ciò che serve a mostrare la vetrina; gli ordini si creano e modificano **solo tramite route API lato server**.

---

## 11. PWA

- Manifest dinamico per locale (`/{slug}/manifest.webmanifest`): nome, colori e icona del locale.
- Icone generate dal logo, con fallback neutro.
- Installabile su Android e iPhone.

---

## 12. Sicurezza e privacy

- RLS su ogni tabella: un gestore non può leggere né scrivere dati di un altro locale (test automatici). Un utente non autenticato non legge gli ordini.
- Nessuna chiave segreta nel codice o in variabili `NEXT_PUBLIC_`. `.env.example` completo, `.env*` in `.gitignore`. Nessuna password o credenziale nel repository, nemmeno di demo (la password del gestore demo si genera allo `seed` e si mostra solo in console).
- Rate limiting e honeypot sulla creazione ordini. Upload immagini con controllo di tipo e dimensione.
- **Privacy:** titolare del trattamento = il locale; la piattaforma = responsabile. Pagina privacy generata per ogni locale con i suoi dati; informativa semplice (nome, cognome, telefono, ordine, note); avviso che le note libere possono contenere allergie. Nessun dato di carta salvato.
- Funzione di anonimizzazione/cancellazione degli ordini più vecchi di N mesi (configurabile).
- Mai committare report di sicurezza, dump del database o file `.env`.

---

## 13. Repository e portfolio

- **README** curato in italiano: cos'è MenuGo, funzioni, screenshot, stack, come installare in locale, come creare un nuovo locale, schema del database, link alla demo.
- Cartella `docs/` con `BRIEF.md`, `INSTALLAZIONE.md`, `SCHEMA.md`.
- Licenza: **file `LICENSE` da decidere dal proprietario** (tutti i diritti riservati oppure open source). Finché non è deciso, Antigravity non aggiunge alcuna licenza e lo segnala.
- Commit piccoli e con messaggi chiari (es. `feat: caricamento logo con rimozione sfondo`).
- Demo pubblica con dati fittizi e accesso gestore demo di sola prova, **senza password nel README**: la password si comunica a parte.
- Screenshot in `docs/img/` (solo dati demo).

---

## 14. Dati demo (seed)

Locale "Trattoria Demo" con logo segnaposto generico, 2 destinazioni, 3 fasce orarie ciascuna, categorie (Antipasti, Primi, Secondi, Contorni, Bevande, Dolci), 15-20 piatti con foto segnaposto, un menu fisso, un piatto del giorno, 15-20 ordini fittizi. Script per cancellare tutti i dati demo.

---

## 15. Piano di lavoro a fasi (una per volta)

**Fase 0: base del progetto.** Nel repository vuoto: `create-next-app` (TypeScript, Tailwind, App Router), struttura cartelle, `src/config/brand.ts`, `.env.example`, `.gitignore`, README iniziale, collegamento a un nuovo progetto Supabase e a un nuovo progetto Vercel, primo deploy con pagina `/`.

**Fase 1: database multi-locale.** Schema, migrazioni SQL, RLS, ruoli (super admin, gestore), test RLS, seed del locale demo.

**Fase 2: vetrina e branding.** Pagina pubblica `/{slug}` con nome, logo, copertina, colori, menu con foto; pannello di modifica di nome/logo/colori/testi, upload su Storage, rimozione sfondo, controllo contrasto, manifest PWA.

**Fase 3: menu completo.** Categorie, prodotti, foto, allergeni, opzioni, menu fissi, extra, piatto del giorno, funzione di calcolo unica con test.

**Fase 4: percorso di ordine del cliente.** Carrello, destinazioni/orari/giorni, riepilogo, conferma, ricevuta, "I miei ordini", disponibilità dinamica, controlli server, modalità solo vetrina.

**Fase 5: pannello gestore.** Dashboard, ordini, servizio, calendario, impostazioni, vista stampabile.

**Fase 6: super admin.** Creazione locali con invito, sospensione, elenco.

**Fase 7: pagamenti.** Contanti, Stripe per locale, commissione (spenta), rimborsi, webhook.

**Fase 8: rifinitura.** Privacy per locale, anonimizzazione, import CSV del menu, test end-to-end, audit di sicurezza, README con screenshot, `INSTALLAZIONE.md`.

---

## 16. Criteri di accettazione

- [ ] Il repository non contiene riferimenti a progetti, clienti o persone precedenti (ricerca testuale senza risultati) né credenziali.
- [ ] Creo un nuovo locale dal super admin in meno di 5 minuti e la vetrina è già online.
- [ ] Il gestore cambia nome, logo, colori, foto e menu e la vetrina si aggiorna subito, compresi ricevuta e manifest PWA.
- [ ] Il locale può passare da "solo vetrina" a "vetrina + ordini" con un interruttore.
- [ ] Un gestore non può vedere né modificare dati di un altro locale (test automatici).
- [ ] I test sui prezzi passano su tutti i casi e il totale mostrato coincide con quello salvato.
- [ ] Dopo l'orario limite un ordine è rifiutato anche chiamando l'API direttamente.
- [ ] Giorni aperti/chiusi del calendario si vedono subito nell'app cliente.
- [ ] Senza chiavi Stripe l'app funziona in solo contanti, senza errori.
- [ ] Tutto ciò che compare ai clienti (orari, prezzi, testi, nome, logo) arriva dal database.
- [ ] Il README permette a un estraneo di installare e provare il progetto.
- [ ] Alla fine di ogni fase: file modificati, SQL, come testare, cosa è ancora fisso nel codice.
