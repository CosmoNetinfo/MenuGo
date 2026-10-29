# MenuGo 🍽️

> **Vetrina e ordini online per la ristorazione**  
> Progetto creato e sviluppato da **Daniele Spalletti, Cosmonet.info** ([GitHub: CosmoNetinfo](https://github.com/CosmoNetinfo)).

MenuGo è una web application (PWA) moderna concepita per qualsiasi attività di ristorazione (ristoranti, pizzerie, tavole calde, mense, bar, catering). Ogni locale dispone della propria vetrina online personalizzata, con nome, logo, colori, foto e menu modificabili in completa autonomia dal gestore, senza richiedere competenze di programmazione.

---

## ✨ Funzionalità Principali

- 🌐 **Vetrina Online Dinamica**: ogni locale ha il proprio URL dedicato (`/{slug}`) con caricamento in tempo reale delle personalizzazioni.
- 🎛️ **Due modalità di servizio selezionabili**:
  - **Solo vetrina**: consultazione digitale del menu con foto, prezzi e allergeni.
  - **Vetrina + ordini**: ordinazioni online per ritiro in sede o consegna programmata.
- 🎨 **Personalizzazione grafica completa**: caricamento logo (con rimozione sfondo e preview chiaro/scuro), copertina, colori primari e d'accento con validazione automatica del contrasto di accessibilità.
- 📋 **Gestione menu ricca**: categorie, piatti, varianti/opzioni, allergeni ufficiali UE, schemi di menu a prezzo fisso a slot, piatti del giorno.
- ⏱️ **Regole orarie e disponibilità**: orario limite per gli ordini, calendario aperture/chiusure forzate, calcolo rigoroso sempre eseguito lato server.
- 📱 **Progressive Web App (PWA)**: installabile su smartphone (iOS/Android) con manifest dinamico brandizzato per ciascun locale.
- 🔒 **Multi-tenant e Sicurezza RLS**: isolamento completo dei dati tra locali garantito a livello di database tramite Row Level Security di PostgreSQL / Supabase.

---

## 🛠️ Stack Tecnologico

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Stile**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth, Storage)
- **Test Unitari**: [Vitest](https://vitest.dev/)
- **Integrazioni pagamenti**: [Stripe](https://stripe.com/) (opzionale per singolo locale)
- **Hosting & Deploy**: [Vercel](https://vercel.com/)

---

## 📂 Struttura del Progetto

```
MenuGo/
├── docs/                   # Documentazione di progetto
│   ├── BRIEF.md            # Specifiche e piano di lavoro a fasi
│   ├── INSTALLAZIONE.md    # Guida all'installazione locale
│   └── SCHEMA.md           # Schema database e modello multi-tenant
├── src/
│   ├── app/                # Next.js App Router (pagine e layout)
│   ├── config/             # Configurazione globale (brand.ts)
│   ├── lib/                # Client Supabase e utility
│   └── types/              # Definizioni TypeScript
├── public/                 # Asset statici
├── vitest.config.ts        # Configurazione test Vitest
└── .env.example            # Variabili d'ambiente di esempio
```

---

## 🚀 Avvio Rapido

Per istruzioni dettagliate passo-passo consulta la [Guida all'installazione](docs/INSTALLAZIONE.md).

```bash
# 1. Installa le dipendenze
npm install

# 2. Configura le variabili d'ambiente
cp .env.example .env.local

# 3. Esegui i test
npm test

# 4. Avvia il server di sviluppo
npm run dev
```

---

## 📄 Licenza

> **Nota:** La tipologia di licenza per questo repository (riservata o open source) è in fase di definizione da parte del proprietario. Nessun file di licenza è stato aggiunto in via preliminare.
