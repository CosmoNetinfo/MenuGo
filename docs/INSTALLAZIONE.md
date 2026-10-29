# MenuGo · Guida all'installazione locale

Questa guida illustra come configurare ed eseguire **MenuGo** in ambiente di sviluppo locale.

---

## 1. Prerequisiti

- **Node.js**: versione 18.17+ (consigliata 20 LTS o superiore)
- **npm** (incluso in Node.js)
- Un account su [Supabase](https://supabase.com) con un nuovo progetto dedicato

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

### 2.3 Variabili d'ambiente
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
```

> ⚠️ **Importante**: non committare mai `.env.local` né inserire chiavi reali nel repository.

---

## 3. Avvio in sviluppo

Avvia il server di sviluppo Next.js:
```bash
npm run dev
```

L'applicazione sarà accessibile all'indirizzo [http://localhost:3000](http://localhost:3000).

---

## 4. Test automatici

Esegui i test unitari con Vitest:
```bash
npm test
```

Oppure in modalità watch:
```bash
npm run test:watch
```

---

## 5. Build di produzione

Per verificare che la build di produzione compili correttamente:
```bash
npm run build
npm start
```
