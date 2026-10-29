'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export async function updateLocaleBrandingAction(params: {
  localeId: string;
  slug: string;
  nome: string;
  slogan: string | null;
  messaggio_benvenuto: string | null;
  colore_primario: string;
  colore_accento: string;
  colore_testo_primario: string;
  logo_url?: string | null;
  copertina_url?: string | null;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('locale_branding')
    .update({
      nome: params.nome,
      slogan: params.slogan,
      messaggio_benvenuto: params.messaggio_benvenuto,
      colore_primario: params.colore_primario,
      colore_accento: params.colore_accento,
      colore_testo_primario: params.colore_testo_primario,
      ...(params.logo_url !== undefined && { logo_url: params.logo_url }),
      ...(params.copertina_url !== undefined && { copertina_url: params.copertina_url }),
    })
    .eq('locale_id', params.localeId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Rivalidazione immediata della vetrina del locale
  revalidatePath(`/${params.slug}`);
  revalidatePath(`/${params.slug}/manifest.webmanifest`);
  revalidatePath('/admin/aspetto');

  return { success: true };
}

export async function updateLocaleSettingsAction(params: {
  localeId: string;
  slug: string;
  modalita: 'solo_vetrina' | 'vetrina_ordini';
  orario_limite_ordini: string;
  orario_limite_annullamento: string;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  link_mappa: string | null;
  link_instagram: string | null;
  link_facebook: string | null;
  testo_ricevuta: string | null;
  testo_privacy: string | null;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('locale_settings')
    .update({
      modalita: params.modalita,
      orario_limite_ordini: params.orario_limite_ordini,
      orario_limite_annullamento: params.orario_limite_annullamento,
      telefono: params.telefono,
      email: params.email,
      indirizzo: params.indirizzo,
      link_mappa: params.link_mappa,
      link_instagram: params.link_instagram,
      link_facebook: params.link_facebook,
      testo_ricevuta: params.testo_ricevuta,
      testo_privacy: params.testo_privacy,
    })
    .eq('locale_id', params.localeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${params.slug}`);
  revalidatePath('/admin/aspetto');

  return { success: true };
}

export async function uploadMediaAction(formData: FormData) {
  const supabase = createAdminClient();

  const file = formData.get('file') as File | null;
  const localeId = formData.get('localeId') as string | null;
  const folder = formData.get('folder') as string | null; // es. 'logo', 'copertina', 'prodotti'

  if (!file || !localeId) {
    return { success: false, error: 'Parametri mancanti per il caricamento' };
  }

  // Verifica tipo MIME (solo PNG, JPG, WebP)
  const allowedMime = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedMime.includes(file.type)) {
    return { success: false, error: 'Formato file non consentito. Usa solo PNG, JPG o WebP.' };
  }

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${localeId}/${folder || 'media'}-${Date.now()}.${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('locali-media')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from('locali-media')
    .getPublicUrl(fileName);

  return { success: true, url: publicUrlData.publicUrl };
}
