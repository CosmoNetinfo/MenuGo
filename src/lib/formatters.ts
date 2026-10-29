/**
 * Utility di formattazione in lingua italiana per MenuGo.
 * 
 * Regola 7:
 * - Importi in formato italiano (15,00 €)
 * - Date con il mese minuscolo (martedì 6 ottobre)
 * - Fuso Europe/Rome
 * - Importi salvati in centesimi (integer)
 */

export function formatPrice(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return '0,00 €';
  }
  const euros = cents / 100;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

export function formatDateItalian(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(date)
    .toLowerCase();
}

export function formatTimeItalian(timeString: string): string {
  if (!timeString) return '';
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeString;
}

/**
 * Elenco ufficiale dei 14 allergeni alimentari (Regolamento UE 1169/2011)
 */
export interface Allergene {
  numero: number;
  nome: string;
  icona: string;
}

export const ALLERGENI_UE: Record<number, Allergene> = {
  1: { numero: 1, nome: 'Cereali contenenti glutine', icona: '🌾' },
  2: { numero: 2, nome: 'Crostacei', icona: '🦐' },
  3: { numero: 3, nome: 'Uova', icona: '🥚' },
  4: { numero: 4, nome: 'Pesce', icona: '🐟' },
  5: { numero: 5, nome: 'Arachidi', icona: '🥜' },
  6: { numero: 6, nome: 'Soia', icona: '🌱' },
  7: { numero: 7, nome: 'Latte e prodotti a base di latte', icona: '🥛' },
  8: { numero: 8, nome: 'Frutta a guscio', icona: '🌰' },
  9: { numero: 9, nome: 'Sedano', icona: '🥬' },
  10: { numero: 10, nome: 'Senape', icona: '🌭' },
  11: { numero: 11, nome: 'Semi di sesamo', icona: '🥯' },
  12: { numero: 12, nome: 'Anidride solforosa e solfiti', icona: '🍷' },
  13: { numero: 13, nome: 'Lupini', icona: '🌿' },
  14: { numero: 14, nome: 'Molluschi', icona: '🦪' },
};
