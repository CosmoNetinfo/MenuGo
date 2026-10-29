/**
 * Definizione dei tipi per il database Supabase di MenuGo
 * Conforme allo schema PostgreSQL multi-locale
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StatoLocale = 'attivo' | 'sospeso';
export type RuoloUtente = 'gestore' | 'staff';
export type ModalitaServizio = 'solo_vetrina' | 'vetrina_ordini';
export type StatoGiorno = 'aperto' | 'chiuso';
export type TipoCommissioneCarta = 'nessuna' | 'fissa' | 'percentuale';
export type TipoServizioOrdine = 'destinazione_programmata' | 'domicilio' | 'ritiro';
export type StatoOrdine = 'in_attesa' | 'confermato' | 'in_preparazione' | 'completato' | 'annullato';
export type StatoPagamento = 'in_attesa' | 'pagato' | 'non_pagato' | 'rimborsato';
export type MetodoPagamento = 'contanti' | 'carta';
export type TipoRigaOrdine = 'prodotto' | 'menu_fisso' | 'piatto_del_giorno' | 'extra';

export interface Database {
  public: {
    Tables: {
      super_admins: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };
      locali: {
        Row: {
          id: string;
          slug: string;
          stato: StatoLocale;
          piano: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          stato?: StatoLocale;
          piano?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          stato?: StatoLocale;
          piano?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      utenti_locale: {
        Row: {
          id: string;
          locale_id: string;
          user_id: string;
          ruolo: RuoloUtente;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          user_id: string;
          ruolo?: RuoloUtente;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          user_id?: string;
          ruolo?: RuoloUtente;
          created_at?: string;
        };
      };
      locale_branding: {
        Row: {
          id: string;
          locale_id: string;
          nome: string;
          slogan: string | null;
          messaggio_benvenuto: string | null;
          logo_url: string | null;
          copertina_url: string | null;
          colore_primario: string;
          colore_accento: string;
          colore_testo_primario: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          nome: string;
          slogan?: string | null;
          messaggio_benvenuto?: string | null;
          logo_url?: string | null;
          copertina_url?: string | null;
          colore_primario?: string;
          colore_accento?: string;
          colore_testo_primario?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          nome?: string;
          slogan?: string | null;
          messaggio_benvenuto?: string | null;
          logo_url?: string | null;
          copertina_url?: string | null;
          colore_primario?: string;
          colore_accento?: string;
          colore_testo_primario?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      locale_settings: {
        Row: {
          id: string;
          locale_id: string;
          modalita: ModalitaServizio;
          orario_limite_ordini: string;
          orario_limite_giorni_anticipo: number;
          lunedi_chiude_sabato: boolean;
          orario_limite_annullamento: string;
          accetta_contanti: boolean;
          accetta_stripe: boolean;
          commissione_carta_tipo: TipoCommissioneCarta;
          commissione_carta_valore: number;
          telefono: string | null;
          email: string | null;
          indirizzo: string | null;
          link_mappa: string | null;
          link_instagram: string | null;
          link_facebook: string | null;
          testo_ricevuta: string | null;
          testo_privacy: string | null;
          mesi_conservazione_ordini: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          modalita?: ModalitaServizio;
          orario_limite_ordini?: string;
          orario_limite_giorni_anticipo?: number;
          lunedi_chiude_sabato?: boolean;
          orario_limite_annullamento?: string;
          accetta_contanti?: boolean;
          accetta_stripe?: boolean;
          commissione_carta_tipo?: TipoCommissioneCarta;
          commissione_carta_valore?: number;
          telefono?: string | null;
          email?: string | null;
          indirizzo?: string | null;
          link_mappa?: string | null;
          link_instagram?: string | null;
          link_facebook?: string | null;
          testo_ricevuta?: string | null;
          testo_privacy?: string | null;
          mesi_conservazione_ordini?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          modalita?: ModalitaServizio;
          orario_limite_ordini?: string;
          orario_limite_giorni_anticipo?: number;
          lunedi_chiude_sabato?: boolean;
          orario_limite_annullamento?: string;
          accetta_contanti?: boolean;
          accetta_stripe?: boolean;
          commissione_carta_tipo?: TipoCommissioneCarta;
          commissione_carta_valore?: number;
          telefono?: string | null;
          email?: string | null;
          indirizzo?: string | null;
          link_mappa?: string | null;
          link_instagram?: string | null;
          link_facebook?: string | null;
          testo_ricevuta?: string | null;
          testo_privacy?: string | null;
          mesi_conservazione_ordini?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      destinazioni: {
        Row: {
          id: string;
          locale_id: string;
          nome: string;
          indirizzo: string | null;
          attiva: boolean;
          ordine: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          nome: string;
          indirizzo?: string | null;
          attiva?: boolean;
          ordine?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          nome?: string;
          indirizzo?: string | null;
          attiva?: boolean;
          ordine?: number;
          created_at?: string;
        };
      };
      fasce_orarie: {
        Row: {
          id: string;
          destinazione_id: string;
          locale_id: string;
          ora_inizio: string;
          ora_fine: string;
          giorni_settimana: number[];
          attiva: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          destinazione_id: string;
          locale_id: string;
          ora_inizio: string;
          ora_fine: string;
          giorni_settimana?: number[];
          attiva?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          destinazione_id?: string;
          locale_id?: string;
          ora_inizio?: string;
          ora_fine?: string;
          giorni_settimana?: number[];
          attiva?: boolean;
          created_at?: string;
        };
      };
      calendario_giorni: {
        Row: {
          id: string;
          locale_id: string;
          destinazione_id: string | null;
          giorno: string;
          stato: StatoGiorno;
          motivo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          destinazione_id?: string | null;
          giorno: string;
          stato: StatoGiorno;
          motivo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          destinazione_id?: string | null;
          giorno?: string;
          stato?: StatoGiorno;
          motivo?: string | null;
          created_at?: string;
        };
      };
      categorie_menu: {
        Row: {
          id: string;
          locale_id: string;
          nome: string;
          descrizione: string | null;
          ordine: number;
          visibile: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          nome: string;
          descrizione?: string | null;
          ordine?: number;
          visibile?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          nome?: string;
          descrizione?: string | null;
          ordine?: number;
          visibile?: boolean;
          created_at?: string;
        };
      };
      prodotti: {
        Row: {
          id: string;
          locale_id: string;
          categoria_id: string;
          nome: string;
          descrizione: string | null;
          prezzo: number; // centesimi
          foto_url: string | null;
          allergeni: number[];
          disponibile: boolean;
          in_evidenza: boolean;
          ordine: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          categoria_id: string;
          nome: string;
          descrizione?: string | null;
          prezzo: number;
          foto_url?: string | null;
          allergeni?: number[];
          disponibile?: boolean;
          in_evidenza?: boolean;
          ordine?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          categoria_id?: string;
          nome?: string;
          descrizione?: string | null;
          prezzo?: number;
          foto_url?: string | null;
          allergeni?: number[];
          disponibile?: boolean;
          in_evidenza?: boolean;
          ordine?: number;
          created_at?: string;
        };
      };
      gruppi_opzioni: {
        Row: {
          id: string;
          locale_id: string;
          prodotto_id: string;
          nome: string;
          obbligatorio: boolean;
          scelta_multipla: boolean;
          min_selezioni: number;
          max_selezioni: number | null;
          ordine: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          prodotto_id: string;
          nome: string;
          obbligatorio?: boolean;
          scelta_multipla?: boolean;
          min_selezioni?: number;
          max_selezioni?: number | null;
          ordine?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          prodotto_id?: string;
          nome?: string;
          obbligatorio?: boolean;
          scelta_multipla?: boolean;
          min_selezioni?: number;
          max_selezioni?: number | null;
          ordine?: number;
          created_at?: string;
        };
      };
      opzioni: {
        Row: {
          id: string;
          gruppo_id: string;
          locale_id: string;
          nome: string;
          prezzo_extra: number; // centesimi
          disponibile: boolean;
          ordine: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          gruppo_id: string;
          locale_id: string;
          nome: string;
          prezzo_extra?: number;
          disponibile?: boolean;
          ordine?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          gruppo_id?: string;
          locale_id?: string;
          nome?: string;
          prezzo_extra?: number;
          disponibile?: boolean;
          ordine?: number;
          created_at?: string;
        };
      };
      menu_fissi: {
        Row: {
          id: string;
          locale_id: string;
          nome: string;
          descrizione: string | null;
          prezzo: number; // centesimi
          attivo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          nome: string;
          descrizione?: string | null;
          prezzo: number;
          attivo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          nome?: string;
          descrizione?: string | null;
          prezzo?: number;
          attivo?: boolean;
          created_at?: string;
        };
      };
      menu_fissi_slot: {
        Row: {
          id: string;
          menu_fisso_id: string;
          locale_id: string;
          nome: string;
          categoria_id: string | null;
          facoltativo: boolean;
          ordine: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_fisso_id: string;
          locale_id: string;
          nome: string;
          categoria_id?: string | null;
          facoltativo?: boolean;
          ordine?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_fisso_id?: string;
          locale_id?: string;
          nome?: string;
          categoria_id?: string | null;
          facoltativo?: boolean;
          ordine?: number;
          created_at?: string;
        };
      };
      piatti_del_giorno: {
        Row: {
          id: string;
          locale_id: string;
          nome: string;
          descrizione: string | null;
          prezzo: number; // centesimi
          foto_url: string | null;
          allergeni: number[];
          giorni_disponibilita: number[];
          attivo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          nome: string;
          descrizione?: string | null;
          prezzo: number;
          foto_url?: string | null;
          allergeni?: number[];
          giorni_disponibilita?: number[];
          attivo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          nome?: string;
          descrizione?: string | null;
          prezzo?: number;
          foto_url?: string | null;
          allergeni?: number[];
          giorni_disponibilita?: number[];
          attivo?: boolean;
          created_at?: string;
        };
      };
      ordini: {
        Row: {
          id: string;
          locale_id: string;
          codice_ordine: string;
          tipo_servizio: TipoServizioOrdine;
          stato: StatoOrdine;
          stato_pagamento: StatoPagamento;
          metodo_pagamento: MetodoPagamento;
          destinazione_snapshot: Json | null;
          data_consegna: string;
          fascia_oraria: string;
          nome_cliente: string;
          cognome_cliente: string;
          telefono_cliente: string;
          note_cliente: string | null;
          totale: number; // centesimi
          commissione_pagamento: number; // centesimi
          stripe_payment_intent_id: string | null;
          anonimizzato: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          locale_id: string;
          codice_ordine: string;
          tipo_servizio: TipoServizioOrdine;
          stato?: StatoOrdine;
          stato_pagamento?: StatoPagamento;
          metodo_pagamento: MetodoPagamento;
          destinazione_snapshot?: Json | null;
          data_consegna: string;
          fascia_oraria: string;
          nome_cliente: string;
          cognome_cliente: string;
          telefono_cliente: string;
          note_cliente?: string | null;
          totale: number;
          commissione_pagamento?: number;
          stripe_payment_intent_id?: string | null;
          anonimizzato?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          locale_id?: string;
          codice_ordine?: string;
          tipo_servizio?: TipoServizioOrdine;
          stato?: StatoOrdine;
          stato_pagamento?: StatoPagamento;
          metodo_pagamento?: MetodoPagamento;
          destinazione_snapshot?: Json | null;
          data_consegna?: string;
          fascia_oraria?: string;
          nome_cliente?: string;
          cognome_cliente?: string;
          telefono_cliente?: string;
          note_cliente?: string | null;
          totale?: number;
          commissione_pagamento?: number;
          stripe_payment_intent_id?: string | null;
          anonimizzato?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      righe_ordine: {
        Row: {
          id: string;
          ordine_id: string;
          locale_id: string;
          tipo: TipoRigaOrdine;
          prodotto_id: string | null;
          nome_snapshot: string;
          prezzo_unitario_snapshot: number; // centesimi
          quantita: number;
          opzioni_scelte_snapshot: Json | null;
          totale_riga: number; // centesimi
          created_at: string;
        };
        Insert: {
          id?: string;
          ordine_id: string;
          locale_id: string;
          tipo: TipoRigaOrdine;
          prodotto_id?: string | null;
          nome_snapshot: string;
          prezzo_unitario_snapshot: number;
          quantita: number;
          opzioni_scelte_snapshot?: Json | null;
          totale_riga: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          ordine_id?: string;
          locale_id?: string;
          tipo?: TipoRigaOrdine;
          prodotto_id?: string | null;
          nome_snapshot?: string;
          prezzo_unitario_snapshot?: number;
          quantita?: number;
          opzioni_scelte_snapshot?: Json | null;
          totale_riga?: number;
          created_at?: string;
        };
      };
      platform_settings: {
        Row: {
          id: string;
          chiave: string;
          valore: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chiave: string;
          valore: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chiave?: string;
          valore?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
