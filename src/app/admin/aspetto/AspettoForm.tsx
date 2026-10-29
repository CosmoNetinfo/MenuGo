'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { checkContrast } from '@/lib/color-utils';
import { processImageForUpload } from '@/lib/image-utils';
import { updateLocaleBrandingAction, updateLocaleSettingsAction, uploadMediaAction } from '@/lib/actions/branding';
import type { Database } from '@/types/database';

interface Props {
  locale: Database['public']['Tables']['locali']['Row'];
  initialBranding: Database['public']['Tables']['locale_branding']['Row'];
  initialSettings: Database['public']['Tables']['locale_settings']['Row'];
}

export default function AspettoForm({ locale, initialBranding, initialSettings }: Props) {
  const [isPending, startTransition] = useTransition();

  // Branding states
  const [nome, setNome] = useState(initialBranding.nome || '');
  const [slogan, setSlogan] = useState(initialBranding.slogan || '');
  const [messaggioBenvenuto, setMessaggioBenvenuto] = useState(initialBranding.messaggio_benvenuto || '');
  const [colorePrimario, setColorePrimario] = useState(initialBranding.colore_primario || '#059669');
  const [coloreAccento, setColoreAccento] = useState(initialBranding.colore_accento || '#ea580c');
  const [coloreTesto, setColoreTesto] = useState(initialBranding.colore_testo_primario || '#ffffff');
  const [logoUrl, setLogoUrl] = useState(initialBranding.logo_url || '');
  const [copertinaUrl, setCopertinaUrl] = useState(initialBranding.copertina_url || '');

  // Settings states
  const [modalita, setModalita] = useState<'solo_vetrina' | 'vetrina_ordini'>(initialSettings.modalita);
  const [orarioLimite, setOrarioLimite] = useState(initialSettings.orario_limite_ordini || '14:00:00');
  const [telefono, setTelefono] = useState(initialSettings.telefono || '');
  const [email, setEmail] = useState(initialSettings.email || '');
  const [indirizzo, setIndirizzo] = useState(initialSettings.indirizzo || '');
  const [linkMappa, setLinkMappa] = useState(initialSettings.link_mappa || '');
  const [linkInstagram, setLinkInstagram] = useState(initialSettings.link_instagram || '');
  const [linkFacebook, setLinkFacebook] = useState(initialSettings.link_facebook || '');
  const [testoPrivacy, setTestoPrivacy] = useState(initialSettings.testo_privacy || '');

  // Logo upload & white background removal states
  const [removeWhiteBg, setRemoveWhiteBg] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calcolo contrasto in tempo reale
  const contrastAnalysis = useMemo(() => {
    return checkContrast(coloreTesto, colorePrimario);
  }, [coloreTesto, colorePrimario]);

  // Gestione caricamento logo
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Elaborazione e rimozione sfondo...');

    try {
      const { blob } = await processImageForUpload(file, {
        maxWidth: 500,
        maxHeight: 500,
        removeWhiteBg,
        outputFormat: removeWhiteBg ? 'image/png' : 'image/webp',
      });

      setUploadStatus('Caricamento su Supabase Storage...');

      const formData = new FormData();
      formData.append('file', blob, removeWhiteBg ? 'logo.png' : 'logo.webp');
      formData.append('localeId', locale.id);
      formData.append('folder', 'logo');

      const res = await uploadMediaAction(formData);
      if (res.success && res.url) {
        setLogoUrl(res.url);
        setUploadStatus('Logo aggiornato con successo!');
      } else {
        setUploadStatus(`Errore: ${res.error}`);
      }
    } catch (err: unknown) {
      setUploadStatus(`Errore durante l'elaborazione: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Gestione caricamento copertina
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Ottimizzazione immagine di copertina...');

    try {
      const { blob } = await processImageForUpload(file, {
        maxWidth: 1600,
        maxHeight: 900,
        outputFormat: 'image/webp',
        quality: 0.85,
      });

      const formData = new FormData();
      formData.append('file', blob, 'copertina.webp');
      formData.append('localeId', locale.id);
      formData.append('folder', 'copertina');

      const res = await uploadMediaAction(formData);
      if (res.success && res.url) {
        setCopertinaUrl(res.url);
        setUploadStatus('Copertina aggiornata con successo!');
      } else {
        setUploadStatus(`Errore: ${res.error}`);
      }
    } catch (err: unknown) {
      setUploadStatus(`Errore durante il caricamento: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Salvataggio di tutte le impostazioni
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus(null);

    startTransition(async () => {
      // 1. Salva Branding
      const resBranding = await updateLocaleBrandingAction({
        localeId: locale.id,
        slug: locale.slug,
        nome,
        slogan: slogan || null,
        messaggio_benvenuto: messaggioBenvenuto || null,
        colore_primario: colorePrimario,
        colore_accento: coloreAccento,
        colore_testo_primario: coloreTesto,
        logo_url: logoUrl || null,
        copertina_url: copertinaUrl || null,
      });

      if (!resBranding.success) {
        setSaveStatus({ type: 'error', message: resBranding.error || 'Errore nel salvataggio branding' });
        return;
      }

      // 2. Salva Settings
      const resSettings = await updateLocaleSettingsAction({
        localeId: locale.id,
        slug: locale.slug,
        modalita,
        orario_limite_ordini: orarioLimite,
        orario_limite_annullamento: initialSettings.orario_limite_annullamento || '09:00:00',
        telefono: telefono || null,
        email: email || null,
        indirizzo: indirizzo || null,
        link_mappa: linkMappa || null,
        link_instagram: linkInstagram || null,
        link_facebook: linkFacebook || null,
        testo_ricevuta: initialSettings.testo_ricevuta,
        testo_privacy: testoPrivacy || null,
      });

      if (!resSettings.success) {
        setSaveStatus({ type: 'error', message: resSettings.error || 'Errore nel salvataggio impostazioni' });
        return;
      }

      setSaveStatus({
        type: 'success',
        message: 'Modifiche salvate con successo! La tua vetrina è stata aggiornata in tempo reale.',
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Aspetto e Personalizzazione Vetrina
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Modifica nome, logo, colori e testi. I clienti vedranno subito le novità sul link del tuo locale.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale.slug}`}
            target="_blank"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5"
          >
            <span>👁️</span> Vedi vetrina live
          </Link>

          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            style={{ backgroundColor: colorePrimario }}
          >
            {isPending ? 'Salvataggio in corso...' : 'Salva modifiche'}
          </button>
        </div>
      </div>

      {/* Messaggi di stato */}
      {saveStatus && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{saveStatus.message}</span>
          {saveStatus.type === 'success' && (
            <Link
              href={`/${locale.slug}`}
              target="_blank"
              className="underline font-bold text-emerald-900 ml-4 whitespace-nowrap"
            >
              Apri vetrina →
            </Link>
          )}
        </div>
      )}

      {/* 1. Modalità del locale */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 mb-2">1. Modalità del servizio</h2>
        <p className="text-xs text-slate-500 mb-6">
          Scegli se permettere ai clienti solo di consultare il menu oppure di inviare anche ordini online.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <label
            className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
              modalita === 'solo_vetrina'
                ? 'border-emerald-600 bg-emerald-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="modalita"
              value="solo_vetrina"
              checked={modalita === 'solo_vetrina'}
              onChange={() => setModalita('solo_vetrina')}
              className="mt-1 text-emerald-600"
            />
            <div>
              <p className="font-bold text-sm text-slate-900">Solo vetrina</p>
              <p className="text-xs text-slate-500 mt-0.5">
                I clienti vedono foto, prezzi e allergeni, ma ordinano telefonicamente o al banco.
              </p>
            </div>
          </label>

          <label
            className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
              modalita === 'vetrina_ordini'
                ? 'border-emerald-600 bg-emerald-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="modalita"
              value="vetrina_ordini"
              checked={modalita === 'vetrina_ordini'}
              onChange={() => setModalita('vetrina_ordini')}
              className="mt-1 text-emerald-600"
            />
            <div>
              <p className="font-bold text-sm text-slate-900">Vetrina + Ordini online</p>
              <p className="text-xs text-slate-500 mt-0.5">
                I clienti scelgono piatti, destinazioni e fasce orarie e inviano l&apos;ordine.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 2. Logo e Copertina */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 mb-2">2. Logo e Copertina</h2>
        <p className="text-xs text-slate-500 mb-6">
          Carica il logo del tuo locale e un&apos;immagine di testata (PNG, JPG o WebP).
        </p>

        {uploadStatus && (
          <div className="p-3 mb-6 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl font-medium">
            {uploadStatus}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Logo upload con opzione rimozione sfondo bianco */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Logo del locale
            </label>

            <div className="space-y-4">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={removeWhiteBg}
                  onChange={(e) => setRemoveWhiteBg(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Rimuovi automaticamente lo sfondo bianco dal logo</span>
              </label>

              {/* Anteprime chiaro / scuro */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Anteprima logo (sfondo chiaro / scuro):
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-center min-h-[90px]">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo su sfondo chiaro" className="max-h-14 object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">Nessun logo</span>
                    )}
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center min-h-[90px]">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo su sfondo scuro" className="max-h-14 object-contain" />
                    ) : (
                      <span className="text-xs text-slate-500">Nessun logo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copertina / Banner */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Immagine di copertina
            </label>
            <div className="space-y-4">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleCoverUpload}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />

              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[120px] flex items-center justify-center">
                {copertinaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={copertinaUrl} alt="Copertina" className="w-full h-32 object-cover" />
                ) : (
                  <span className="text-xs text-slate-400">Nessuna copertina caricata</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Colori e Controllo Contrasto */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 mb-2">3. Colori e Controllo Contrasto (WCAG)</h2>
        <p className="text-xs text-slate-500 mb-6">
          Personalizza l&apos;identità visiva del locale. Il sistema verifica automaticamente che il testo rimanga leggibile.
        </p>

        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Colore Principale (Header e Bottoni)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorePrimario}
                onChange={(e) => setColorePrimario(e.target.value)}
                className="h-10 w-14 rounded-lg cursor-pointer border border-slate-300"
              />
              <input
                type="text"
                value={colorePrimario}
                onChange={(e) => setColorePrimario(e.target.value)}
                className="w-28 text-xs font-mono uppercase px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Colore d&apos;Accento (Badge e Notifiche)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={coloreAccento}
                onChange={(e) => setColoreAccento(e.target.value)}
                className="h-10 w-14 rounded-lg cursor-pointer border border-slate-300"
              />
              <input
                type="text"
                value={coloreAccento}
                onChange={(e) => setColoreAccento(e.target.value)}
                className="w-28 text-xs font-mono uppercase px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Colore del Testo su Colore Principale
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={coloreTesto}
                onChange={(e) => setColoreTesto(e.target.value)}
                className="h-10 w-14 rounded-lg cursor-pointer border border-slate-300"
              />
              <input
                type="text"
                value={coloreTesto}
                onChange={(e) => setColoreTesto(e.target.value)}
                className="w-28 text-xs font-mono uppercase px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Verifica contrasto in tempo reale */}
        <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-lg font-bold text-xs shadow-xs"
              style={{ backgroundColor: colorePrimario, color: coloreTesto }}
            >
              Anteprima Bottone
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                Rapporto di contrasto: {contrastAnalysis.ratio}:1
              </p>
              <p className="text-[11px] text-slate-500">
                {contrastAnalysis.isAccessible ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Conforme agli standard di leggibilità WCAG ({contrastAnalysis.level})
                  </span>
                ) : (
                  <span className="text-rose-700 font-semibold">
                    ⚠️ Contrasto insufficiente (&lt; 4.5:1). Il testo potrebbe essere difficile da leggere.
                  </span>
                )}
              </p>
            </div>
          </div>

          {!contrastAnalysis.isAccessible && (
            <button
              type="button"
              onClick={() => setColoreTesto(contrastAnalysis.recommendedTextColor)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Applica contrasto ottimale ({contrastAnalysis.recommendedTextColor})
            </button>
          )}
        </div>
      </div>

      {/* 4. Testi e Comunicazione */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900 mb-2">4. Testi e Comunicazione</h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nome visibile del locale (in vetrina)
          </label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Slogan o breve descrizione
          </label>
          <input
            type="text"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="es. Pizze artigianali a lievitazione naturale"
            className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Messaggio di benvenuto in vetrina
          </label>
          <textarea
            rows={3}
            value={messaggioBenvenuto}
            onChange={(e) => setMessaggioBenvenuto(e.target.value)}
            placeholder="Messaggio speciale o indicazioni per i clienti..."
            className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 5. Contatti, Orari e Privacy */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900 mb-2">5. Contatti e Orari</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Indirizzo completo</label>
            <input
              type="text"
              value={indirizzo}
              onChange={(e) => setIndirizzo(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Link Google Maps</label>
            <input
              type="url"
              value={linkMappa}
              onChange={(e) => setLinkMappa(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Link Instagram</label>
            <input
              type="url"
              value={linkInstagram}
              onChange={(e) => setLinkInstagram(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Link Facebook</label>
            <input
              type="url"
              value={linkFacebook}
              onChange={(e) => setLinkFacebook(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Orario limite per gli ordini del giorno successivo
          </label>
          <input
            type="time"
            value={orarioLimite}
            onChange={(e) => setOrarioLimite(e.target.value)}
            className="w-48 text-sm px-4 py-2.5 rounded-xl border border-slate-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Informativa privacy sintetica</label>
          <textarea
            rows={2}
            value={testoPrivacy}
            onChange={(e) => setTestoPrivacy(e.target.value)}
            className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300"
          />
        </div>
      </div>

      {/* Salva button in fondo alla pagina */}
      <div className="flex justify-end gap-4 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: colorePrimario }}
        >
          {isPending ? 'Salvataggio in corso...' : 'Salva tutte le modifiche'}
        </button>
      </div>
    </form>
  );
}
