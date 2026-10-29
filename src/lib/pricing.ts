/**
 * Modulo Unico di Calcolo Prezzi e Validazione Menu — MenuGo
 *
 * Utilizzato sia in anteprima client che per la validazione sul server.
 * Tutti gli importi sono espressi in CENTESIMI (integer >= 0).
 */

export interface CartItemOpzione {
  opzioneId: string;
  nome: string;
  prezzoExtraCentesimi: number;
}

export interface CartItemProdotto {
  tipo: 'prodotto';
  prodottoId: string;
  nome: string;
  prezzoUnitarioCentesimi: number;
  quantita: number;
  opzioni?: CartItemOpzione[];
}

export interface SceltaSlotMenuFisso {
  slotId: string;
  nomeSlot: string;
  prodottoId?: string; // Può essere omesso se lo slot è facoltativo
  nomeProdotto?: string;
  categoriaId?: string;
}

export interface CartItemMenuFisso {
  tipo: 'menu_fisso';
  menuFissoId: string;
  nome: string;
  prezzoFissoCentesimi: number;
  quantita: number;
  scelteSlot: SceltaSlotMenuFisso[];
}

export interface CartItemPiattoDelGiorno {
  tipo: 'piatto_del_giorno';
  piattoId: string;
  nome: string;
  prezzoUnitarioCentesimi: number;
  quantita: number;
  giorniDisponibilita: number[]; // 1 = Lunedì, ..., 7 = Domenica
}

export type CartItem = CartItemProdotto | CartItemMenuFisso | CartItemPiattoDelGiorno;

export interface DefinizioneSlot {
  id: string;
  nome: string;
  categoriaId?: string | null;
  facoltativo: boolean;
}

export interface DefinizioneMenuFisso {
  id: string;
  nome: string;
  prezzoCentesimi: number;
  attivo: boolean;
  slots: DefinizioneSlot[];
}

export interface RigaDettaglioCalcolo {
  descrizione: string;
  quantita: number;
  prezzoUnitarioCentesimi: number;
  totaleCentesimi: number;
  dettagli?: string[];
}

export interface CalcoloTotaleOptions {
  costoConsegnaCentesimi?: number;
  giornoSettimana?: number; // 1 = Lunedì, 7 = Domenica (Europe/Rome)
  definizioniMenuFissi?: Record<string, DefinizioneMenuFisso>;
}

export interface RisultatoCalcoloTotale {
  isValido: boolean;
  erroriValidazione: string[];
  subtotaleProdottiCentesimi: number;
  costoConsegnaCentesimi: number;
  totaleCentesimi: number;
  righe: RigaDettaglioCalcolo[];
}

/**
 * Calcola il totale di un insieme di prodotti con rigore su centesimi e validazione regole di business.
 */
export function calcolaTotaleOrdine(
  items: CartItem[],
  options: CalcoloTotaleOptions = {}
): RisultatoCalcoloTotale {
  const errori: string[] = [];
  const righe: RigaDettaglioCalcolo[] = [];
  let subtotale = 0;

  const giornoCorrente = options.giornoSettimana ?? getGiornoSettimanaAttuale();

  for (const item of items) {
    if (!item.quantita || item.quantita <= 0) {
      errori.push(`Quantità non valida per "${item.nome}" (${item.quantita}).`);
      continue;
    }

    if (item.tipo === 'prodotto') {
      let prezzoSingolo = Math.max(0, Math.round(item.prezzoUnitarioCentesimi));
      const dettagliOpzioni: string[] = [];

      if (item.opzioni && item.opzioni.length > 0) {
        for (const opz of item.opzioni) {
          const extra = Math.max(0, Math.round(opz.prezzoExtraCentesimi || 0));
          prezzoSingolo += extra;
          if (extra > 0) {
            dettagliOpzioni.push(`${opz.nome} (+${formatCentesimi(extra)})`);
          } else {
            dettagliOpzioni.push(opz.nome);
          }
        }
      }

      const totaleRiga = prezzoSingolo * item.quantita;
      subtotale += totaleRiga;

      righe.push({
        descrizione: item.nome,
        quantita: item.quantita,
        prezzoUnitarioCentesimi: prezzoSingolo,
        totaleCentesimi: totaleRiga,
        dettagli: dettagliOpzioni.length > 0 ? dettagliOpzioni : undefined,
      });
    } else if (item.tipo === 'menu_fisso') {
      const def = options.definizioniMenuFissi?.[item.menuFissoId];

      if (def) {
        if (!def.attivo) {
          errori.push(`Il menu fisso "${def.nome}" non è attualmente disponibile.`);
        }

        // Valida gli slot
        for (const slotDef of def.slots) {
          const scelta = item.scelteSlot.find((s) => s.slotId === slotDef.id);

          if (!slotDef.facoltativo && (!scelta || !scelta.prodottoId)) {
            errori.push(
              `Nel menu fisso "${def.nome}" lo slot obbligatorio "${slotDef.nome}" non è stato selezionato.`
            );
          }

          if (scelta && scelta.prodottoId && slotDef.categoriaId && scelta.categoriaId) {
            if (scelta.categoriaId !== slotDef.categoriaId) {
              errori.push(
                `Il piatto selezionato per lo slot "${slotDef.nome}" non appartiene alla categoria prevista.`
              );
            }
          }
        }
      } else if (item.scelteSlot.length === 0) {
        errori.push(`Il menu fisso "${item.nome}" deve contenere almeno una scelta valida.`);
      }

      const prezzoFisso = Math.max(0, Math.round(item.prezzoFissoCentesimi));
      const totaleRiga = prezzoFisso * item.quantita;
      subtotale += totaleRiga;

      const dettagliScelte = item.scelteSlot
        .filter((s) => s.prodottoId && s.nomeProdotto)
        .map((s) => `${s.nomeSlot}: ${s.nomeProdotto}`);

      righe.push({
        descrizione: `Menu Fisso: ${item.nome}`,
        quantita: item.quantita,
        prezzoUnitarioCentesimi: prezzoFisso,
        totaleCentesimi: totaleRiga,
        dettagli: dettagliScelte.length > 0 ? dettagliScelte : undefined,
      });
    } else if (item.tipo === 'piatto_del_giorno') {
      // Controlla disponibilità per il giorno della settimana (1..7)
      if (!item.giorniDisponibilita.includes(giornoCorrente)) {
        errori.push(
          `Il piatto del giorno "${item.nome}" non è disponibile per il giorno selezionato.`
        );
      }

      const prezzo = Math.max(0, Math.round(item.prezzoUnitarioCentesimi));
      const totaleRiga = prezzo * item.quantita;
      subtotale += totaleRiga;

      righe.push({
        descrizione: `Piatto del Giorno: ${item.nome}`,
        quantita: item.quantita,
        prezzoUnitarioCentesimi: prezzo,
        totaleCentesimi: totaleRiga,
      });
    }
  }

  const costoConsegna = Math.max(0, Math.round(options.costoConsegnaCentesimi || 0));
  const totale = subtotale + costoConsegna;

  return {
    isValido: errori.length === 0,
    erroriValidazione: errori,
    subtotaleProdottiCentesimi: subtotale,
    costoConsegnaCentesimi: costoConsegna,
    totaleCentesimi: totale,
    righe,
  };
}

/**
 * Restituisce il giorno della settimana corrente secondo il fuso Europe/Rome
 * (1 = Lunedì, ..., 7 = Domenica).
 */
export function getGiornoSettimanaAttuale(dataRiferimento: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
  }).format(dataRiferimento);

  switch (parts) {
    case 'Mon': return 1;
    case 'Tue': return 2;
    case 'Wed': return 3;
    case 'Thu': return 4;
    case 'Fri': return 5;
    case 'Sat': return 6;
    case 'Sun': return 7;
    default: return 1;
  }
}

function formatCentesimi(centesimi: number): string {
  const euro = (centesimi / 100).toFixed(2).replace('.', ',');
  return `${euro} €`;
}
