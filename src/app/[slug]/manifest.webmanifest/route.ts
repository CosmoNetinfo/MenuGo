import { NextResponse } from 'next/server';
import { getFullLocaleBySlug } from '@/lib/queries/locale';

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const data = await getFullLocaleBySlug(params.slug);

  if (!data || data.locale.stato !== 'attivo') {
    return new NextResponse('Manifest not found', { status: 404 });
  }

  const { branding } = data;
  const nomeLocale = branding.nome || data.locale.slug;

  const manifest = {
    name: nomeLocale,
    short_name: nomeLocale.length > 12 ? nomeLocale.substring(0, 12) : nomeLocale,
    description: branding.slogan || `Vetrina e ordini online per ${nomeLocale}`,
    start_url: `/${data.locale.slug}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: branding.colore_primario || '#059669',
    orientation: 'portrait-primary',
    lang: 'it-IT',
    icons: branding.logo_url
      ? [
          {
            src: branding.logo_url,
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any maskable',
          },
          {
            src: branding.logo_url,
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any maskable',
          },
        ]
      : [
          {
            src: '/demo/placeholder-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
