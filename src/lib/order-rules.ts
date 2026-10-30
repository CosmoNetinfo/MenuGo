/**
 * Regole di Business e Validazione Ordini — MenuGo
 *
 * Gestisce:
 * - Calcolo dell'orario limite per l'invio dell'ordine (es. 14:00 del giorno prima)
 * - Regola speciale: "il lunedì chiude il sabato"
 * - Orario limite di annullamento (es. 09:00 del giorno di consegna)
 * - Generazione codice ordine univoco human-friendly (es. MG-7821)
 * - Fuso orario standard Europe/Rome
 */

export interface RegoleOrarieSettings {
  orario_limite_ordini: string; // formato "HH:MM:SS" o "HH:MM"
  orario_limite_giorni_anticipo: number; // default 1 (giorno prima)
  lunedi_chiude_sabato: boolean;
  orario_limite_annullamento: string; // formato "HH:MM:SS" o "HH:MM"
}

export interface CalendarioGiornoRecord {
  giorno: string; // "YYYY-MM-DD"
  stato: 'automatico' | 'aperto' | 'chiuso';
  motivo_chiusura?: string | null;
  destinazione_id?: string | null;
}

/**
 * Converte una stringa data "YYYY-MM-DD" e ora "HH:MM" in un oggetto Date
 * interpretato nel fuso di Roma Europe/Rome.
 */
export function creaDataRome(dataStr: string, oraStr: string): Date {
  const [anno, mese, giorno] = dataStr.split('-').map(Number);
  const [ore, minuti] = oraStr.split(':').map(Number);

  // Creiamo una data ISO con offset corretto per l'Europa/Roma
  // Per semplicità deterministica creiamo la stringa con formato standard
  // e calcoliamo la differenza rispetto a UTC per Roma
  const dataTest = new Date(Date.UTC(anno, mese - 1, giorno, ore, minuti));
  
  // Calcola l'offset di Roma per questa data
  const romeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(dataTest);

  const getPart = (type: string) => Number(romeParts.find((p) => p.type === type)?.value || 0);
  const romeHour = getPart('hour') === 24 ? 0 : getPart('hour');
  const utcHour = dataTest.getUTCHours();
  
  // Offset in ore tra Roma e UTC (generalmente +1 in solare o +2 in legale)
  let offsetOre = (romeHour - utcHour + 24) % 24;
  if (offsetOre > 12) offsetOre -= 24;

  const realUtcTime = dataTest.getTime() - offsetOre * 60 * 60 * 1000;
  return new Date(realUtcTime);
}

/**
 * Restituisce la deadline (Date) entro cui inviare l'ordine per la data di consegna indicata.
 */
export function calcolaDeadlineOrdine(
  dataConsegnaStr: string, // "YYYY-MM-DD"
  settings: Pick<RegoleOrarieSettings, 'orario_limite_ordini' | 'orario_limite_giorni_anticipo' | 'lunedi_chiude_sabato'>
): Date {
  const [anno, mese, giorno] = dataConsegnaStr.split('-').map(Number);
  const dataConsegna = new Date(Date.UTC(anno, mese - 1, giorno));
  
  // Giorno della settimana: 0 = Dom, 1 = Lun, ..., 6 = Sab
  const giornoSettimana = dataConsegna.getUTCDay();

  let giorniDaSottrarre = settings.orario_limite_giorni_anticipo;

  // Se la consegna è di lunedì (1) e l'opzione "il lunedì chiude il sabato" è attiva
  if (giornoSettimana === 1 && settings.lunedi_chiude_sabato) {
    giorniDaSottrarre = 2; // Sabato è 2 giorni prima di lunedì
  }

  const deadlineGiorno = new Date(dataConsegna.getTime() - giorniDaSottrarre * 24 * 60 * 60 * 1000);
  const deadlineGiornoStr = deadlineGiorno.toISOString().split('T')[0];

  return creaDataRome(deadlineGiornoStr, settings.orario_limite_ordini);
}

/**
 * Verifica se l'orario limite per ordinare è stato superato.
 */
export function isOrarioLimiteSuperato(
  dataConsegnaStr: string,
  settings: Pick<RegoleOrarieSettings, 'orario_limite_ordini' | 'orario_limite_giorni_anticipo' | 'lunedi_chiude_sabato'>,
  adesso: Date = new Date()
): boolean {
  const deadline = calcolaDeadlineOrdine(dataConsegnaStr, settings);
  return adesso.getTime() > deadline.getTime();
}

/**
 * Verifica se un ordine può essere annullato dal cliente.
 */
export function puoAnnullareOrdine(
  dataConsegnaStr: string,
  settings: Pick<RegoleOrarieSettings, 'orario_limite_annullamento'>,
  statoOrdine: string,
  adesso: Date = new Date()
): { consentito: boolean; motivo?: string } {
  if (statoOrdine === 'annullato') {
    return { consentito: false, motivo: "L'ordine è già stato annullato." };
  }
  if (statoOrdine === 'in_preparazione' || statoOrdine === 'completato') {
    return { consentito: false, motivo: "L'ordine è già in preparazione o completato." };
  }

  // La deadline per l'annullamento è l'orario configurato nel giorno di consegna
  const deadlineAnnullamento = creaDataRome(dataConsegnaStr, settings.orario_limite_annullamento);

  if (adesso.getTime() > deadlineAnnullamento.getTime()) {
    return {
      consentito: false,
      motivo: `L'orario limite per l'annullamento (${settings.orario_limite_annullamento.slice(0, 5)}) è superato.`,
    };
  }

  return { consentito: true };
}

/**
 * Genera un codice ordine breve e memorabile, es: MG-5821
 */
export function generaCodiceOrdine(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MG-${num}`;
}
