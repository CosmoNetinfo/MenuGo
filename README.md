# MenuGo 🍽️

> **Piattaforma SaaS Multi-Tenant per la Vetrina e gli Ordini Online nella Ristorazione**  
> Progetto ideato, ingegnerizzato e sviluppato da **Daniele Spalletti, Cosmonet.info** ([GitHub: CosmoNetinfo](https://github.com/CosmoNetinfo)).

MenuGo è una moderna Progressive Web Application (PWA) progettata per qualsiasi attività di ristorazione (trattorie, ristoranti, pizzerie, tavole calde, mense, bistrot, laboratori artigianali e catering).  
Ciascun locale dispone del proprio URL dedicato (`/{slug}`) con identità visiva personalizzata (logo, copertina, colori, messaggi, manifest PWA) e gestione autonoma del menu, delle regole di servizio e degli ordini, senza richiedere competenze tecniche.

---

## 🌟 Architettura e Caratteristiche Distintive

### 1. Vetrina Pubblica & Ordinazioni (`/{slug}`)
- **Due modalità di servizio selezionabili con un interruttore**:
  - *Solo vetrina*: consultazione digitale del menu con foto, prezzi, varianti e 14 allergeni ufficiali UE.
  - *Vetrina + ordini*: carrello reattivo, selezione del servizio (ritiro al locale, consegna a domicilio per zona, destinazione programmata/aziendale).
- **Controllo orario rigoroso**: calcolo disponibilità giorni e fasce orarie eseguito rigorosamente lato server con fuso `Europe/Rome`. Supporto regole avanzate (es. orario limite entro le 14:00, "ordini per lunedì chiudono sabato", giorni minimi di anticipo).
- **Composizioni avanzate**: piatti con gruppi varianti (obbligatorie/facoltative con supplementi) e menu a prezzo fisso con formule a slot (es. Primo + Secondo + Bibita).
- **Ricevuta in-app & "I miei ordini"**: consultazione stato ordine in tempo reale, codice univoco (es. `ORD-AB12CD`), possibilità di annullamento autonomo entro l'orario limite stabilito dal gestore e dicitura di conformità non fiscale.
- **Informativa Privacy dinamica (`/{slug}/privacy`)**: termini e trattamento dati personalizzati per ogni ristorante nel pieno rispetto del GDPR.

### 2. Pannello di Gestione del Ristoratore (`/admin`)
- **Dashboard Operativa (`/admin`)**: riepilogo ordini della giornata, fatturato (previsto, già incassato, ancora da incassare alla cassa), piatti più ordinati da preparare e scorciatoie ai moduli.
- **Gestione Ordini (`/admin/ordini`)**: filtri per data, ricerca clienti, avanzamento stati (*in attesa → confermato → in preparazione → completato*) e registrazione pagamento contanti alla consegna.
- **Scheda Cucina Stampabile (`/admin/cucina`)**: visualizzazione ad alto contrasto ottimizzata per la stampa cartacea (`@media print`), con aggregato esatto delle porzioni totali da cucinare e timeline dettagliata degli ordini.
- **Configurazione Servizio (`/admin/servizio`)**: switch *solo vetrina / vetrina ordini*, gestione zone di consegna a domicilio con tariffa personalizzata e sedi aziendali/punti fissi convenzionati.
- **Calendario Straordinario (`/admin/calendario`)**: impostazione chiusure per ferie o aperture speciali sui successivi 21 giorni con avviso automatico in caso di ordini già registrati per quella data.
- **Branding & Identità Visiva (`/admin/aspetto`)**: caricamento logo e copertina su Supabase Storage, rimozione automatica sfondo bianco su canvas HTML5, validazione contrasto cromatico WCAG (AA/AAA) e manifest PWA personalizzato.
- **Menu Manager (`/admin/menu`)**: categorie ordinate, prodotti, 14 allergeni UE, gruppi varianti e opzioni, menu combo fissi, piatti del giorno.
- **Impostazioni Negozio (`/admin/impostazioni`)**: recapiti, orari limite di ordinazione e disdetta, abilitazione contanti/Stripe con avviso normativo sui supplementi carta e parametri di conservazione dati GDPR.

### 3. Pannello Super Amministratore (`/super`)
- **Supervisione Globale Multi-Tenant**: monitoraggio di tutti i ristoranti attivi sulla piattaforma, ordini totali transati e fatturato aggregato.
- **Onboarding Istantaneo Locali**: creazione nuovo locale in meno di 2 minuti indicando nome, slug ed email del gestore.
- **Sicurezza Credenziali**: password temporanea casuale a 16 caratteri generata crittograficamente e mostrata unicamente a schermo/terminale, mai salvata in chiaro né inclusa nel repository.
- **Generazione Demo Facoltativa**: popolamento automatico del nuovo locale con categorie e piatti dimostrativi tipici italiani.
- **Governance della Piattaforma**: sospensione/riattivazione istantanea dei locali e gestione piani di abbonamento (*base, pro, enterprise*).

### 4. Pagamenti & Webhook Stripe (`/api/webhooks/stripe`)
- Modalità contanti alla consegna o al ritiro sempre disponibile di serie.
- Integrazione nativa Stripe per pagamenti online con carte di credito, debito e prepagate:
  - Generazione dinamica sessioni Stripe Checkout.
  - Ricezione ed elaborazione webhook con verifica crittografica della firma `stripe-signature`.
  - Idempotenza completa per prevenire doppi addebiti.
  - Gestione rimborsi sincronizzati (`charge.refunded`).

### 5. Rispetto del GDPR & Script di Manutenzione
- Script automatico `npm run anonimizza-ordini`: anonimizza i dati personali dei clienti (nome, telefono, indirizzo) per gli ordini anteriori al numero di mesi impostato dal gestore, conservando i totali contabili per finalità fiscali e statistiche.
- Script `npm run crea-utente-demo`: genera credenziali casuali per l'ambiente demo locale.

---

## 🛠️ Stack Tecnologico

- **Frontend & Routing**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Server Components)
- **Linguaggio**: [TypeScript 5](https://www.typescriptlang.org/) (strict mode, zero hardcoding)
- **Stile & Layout**: [Tailwind CSS](https://tailwindcss.com/) (mobile-first, responsive da smartphone, layout cucina stampabile)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 15, Row Level Security su tutte le 21 tabelle, Auth gestori e super admin, Storage loghi e immagini)
- **Pagamenti**: [Stripe](https://stripe.com/)
- **Test Suite**: [Vitest](https://vitest.dev/) (66 test unitari e di integrazione passati al 100%)
- **Deploy**: [Vercel](https://vercel.com/)

---

## 🔒 Sicurezza e Isolamento Dati (RLS)

1. **Row Level Security (RLS)** attiva su ogni tabella del database:
   - Il pubblico non autenticato accede in sola lettura esclusivamente ai locali attivi e ai loro cataloghi.
   - Gli ordini e le relative righe si creano **esclusivamente tramite Server Actions** protette che ricalcolano ogni prezzo a partire dal database, ignorando qualsiasi manomissione da client.
   - Ogni gestore autenticato accede, visualizza e modifica esclusivamente i record associati al proprio `locale_id`.
   - Il Super Admin dispone di visibilità e controllo trasversale su tutti i locali della piattaforma.
2. **Protezione Server-Side Middleware**:
   - `src/middleware.ts` verifica l'identità autentica tramite `supabase.auth.getUser()` su tutte le rotte `/admin` e `/super`.
   - Disconnessione e reindirizzamento immediato per utenti privi di associazione a un locale.
   - Protezione da Open Redirect con validazione rigorosa dei percorsi interni (`percorsoSicuro`).

---

## 📂 Struttura del Repository

```
MenuGo/
├── docs/                   # Specifiche, installazione e documentazione schema
│   ├── BRIEF.md            # Requisiti e roadmap completata
│   ├── INSTALLAZIONE.md    # Guida dettagliata all'avvio in locale
│   └── SCHEMA.md           # Schema database dettagliato e policy RLS
├── scripts/
│   ├── crea-utente-demo.mjs   # Creazione utenti demo con password casuale
│   └── anonimizza-ordini.mjs  # Manutenzione GDPR ordini storici
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── [slug]/         # Vetrina, carrello, ricevuta e privacy
│   │   ├── admin/          # Dashboard, ordini, cucina, menu, aspetto, impostazioni
│   │   ├── super/          # Pannello globale super admin
│   │   └── api/            # Route API disponibilità e webhook Stripe
│   ├── components/         # Componenti riutilizzabili (carrello, drawer, manager)
│   ├── config/             # Configurazione brand
│   ├── lib/                # Azioni server, calcolo prezzi, regole orarie, client Supabase
│   └── tests/              # Test suite Vitest (RLS, prezzi, regole, ordini, auth)
├── supabase/
│   ├── migrations/         # Migrazioni PostgreSQL con RLS
│   ├── RUN_ALL.sql         # Script SQL consolidato per nuovo database
│   └── seed.sql            # Locale demo "Trattoria Demo"
└── package.json
```

---

## 🚀 Installazione e Avvio Rapido

Per istruzioni dettagliate passo-passo consulta la [Guida all'installazione](docs/INSTALLAZIONE.md).

```bash
# 1. Clona il repository e installa le dipendenze
git clone https://github.com/CosmoNetinfo/MenuGo.git
cd MenuGo
npm install

# 2. Configura le variabili d'ambiente in .env.local
cp .env.example .env.local

# 3. Esegui la suite di test
npm test

# 4. Compila per produzione per verificare l'integrità
npm run build

# 5. Avvia il server locale di sviluppo
npm run dev
```

---

## 🧪 Esecuzione dei Test

```bash
# Esegui tutti i 66 test unitari e di integrazione
npm test
```

---

## 📄 Licenza

Copyright © 2026 **Daniele Spalletti, Cosmonet.info**. Tutti i diritti riservati.  
La tipologia di licenza per questo repository è in fase di definizione da parte del titolare.
