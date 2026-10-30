# MenuGo · Guida all'installazione locale

Questa guida illustra come configurare ed eseguire **MenuGo** in ambiente di sviluppo locale.

---

## 1. Prerequisiti

- **Node.js**: versione 18.17+ (consigliata 20 LTS o superiore)
- **npm** (incluso in Node.js)
- Un account su [Supabase](https://supabase.com) con un nuovo progetto dedicato
- (Opzionale) Un account [Stripe](https://stripe.com) per testare i pagamenti online con carta

---

## 2. Configurazione del progetto

### 2.1 Clonazione del repository
```bash
git clone https://github.com/CosmoNetinfo/MenuGo.git
cd MenuGo
```

### 2.2 Installazione delle dipendenze
```bash
npm install
```

### 2.3 Configurazione Database Supabase
Nel pannello **SQL Editor** del tuo progetto Supabase:
1. Esegui il file `supabase/RUN_ALL.sql` per creare tutte le 21 tabelle, funzioni RLS, indici e trigger.
2. Esegui il file `supabase/seed.sql` per creare il locale dimostrativo `trattoria-demo` con categorie e piatti.
3. Nel pannello **Storage**, crea un bucket pubblico denominato `locali` per ospitare loghi e immagini copertina.

### 2.4 Variabili d'ambiente
Copia il file `.env.example` in `.env.local`:
```bash
cp .env.example .env.local
```

Configura i parametri del tuo progetto Supabase all'interno di `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=la-tua-anon-key
SUPABASE_SERVICE_ROLE_KEY=la-tua-service-role-key

# Opzionali per pagamenti Stripe (se assenti, la piattaforma opera in contanti)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> ⚠️ **Importante**: non committare mai `.env.local` né inserire chiavi reali nel repository.

---

### 2.5 Creazione Utenti Demo
Per generare un Super Admin e un Gestore collegato a Trattoria Demo con password casuale stampata solo a terminale:
```bash
npm run crea-utente-demo
```

---

## 3. Avvio in sviluppo

Avvia il server di sviluppo Next.js:
```bash
npm run dev
```

L'applicazione sarà accessibile all'indirizzo [http://localhost:3000](http://localhost:3000):
- **Vetrina Demo:** [http://localhost:3000/trattoria-demo](http://localhost:3000/trattoria-demo)
- **Login Gestore:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Login Super Admin:** [http://localhost:3000/super/login](http://localhost:3000/super/login)

---

## 4. Manutenzione e GDPR

Per anonimizzare gli ordini storici oltre il periodo di conservazione stabilito da ciascun locale:
```bash
npm run anonimizza-ordini
```

---

## 5. Test automatici

Esegui l'intera suite di test con Vitest (66 test):
```bash
npm test
```

Oppure in modalità interattiva watch:
```bash
npm run test:watch
```

---

## 6. Build di produzione

Per verificare che la build di produzione compili senza errori di tipo o linting:
```bash
npm run build
npm start
```
