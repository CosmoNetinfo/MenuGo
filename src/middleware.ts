import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = request.nextUrl.pathname;

  // Protezione /admin/*
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      // Se è già loggato, rimanda al pannello
      if (session) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return response;
    }
    // Tutte le altre pagine /admin richiedono sessione
    if (!session) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Protezione /super/*
  if (pathname.startsWith('/super')) {
    if (pathname === '/super/login') {
      if (session) {
        return NextResponse.redirect(new URL('/super', request.url));
      }
      return response;
    }
    if (!session) {
      const loginUrl = new URL('/super/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verifica che l'utente sia super admin
    const { data: isSuperAdmin } = await supabase
      .rpc('is_super_admin', { check_user_id: session.user.id });

    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/super/:path*'],
};
