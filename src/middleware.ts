import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export interface SupabaseAuthUserClient {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; email?: string } | null }; error?: unknown }>;
    signOut: () => Promise<unknown>;
  };
  rpc: (fn: string, params: { check_user_id: string }) => Promise<{ data: boolean | null; error?: unknown }>;
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        limit: (n: number) => Promise<{ data: Array<{ locale_id?: string }> | null; error?: unknown }>;
      };
    };
  };
}

export async function processAuthMiddleware(request: NextRequest, supabase: SupabaseAuthUserClient) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Verifica reale lato server con getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protezione /admin/*
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (user) {
        // Se l'utente è loggato, verifica se ha un locale o è super admin
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
          check_user_id: user.id,
        });

        let haLocale = false;
        if (!isSuperAdmin) {
          const { data: recordLocale } = await supabase
            .from('utenti_locale')
            .select('locale_id')
            .eq('user_id', user.id)
            .limit(1);

          haLocale = Boolean(recordLocale && recordLocale.length > 0);
        }

        if (isSuperAdmin || haLocale) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }

        // Utente autenticato ma senza locale: logout forzato e redirect con messaggio
        await supabase.auth.signOut();
        const loginUrl = new URL('/admin/login', request.url);
        loginUrl.searchParams.set('errore', 'Questo account non è collegato a nessun locale');
        return NextResponse.redirect(loginUrl);
      }
      return response;
    }

    // Tutte le altre pagine /admin richiedono sessione valida
    if (!user) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Controlla che l'utente sia un super admin oppure compaia in utenti_locale
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
      check_user_id: user.id,
    });

    let haLocale = false;
    if (!isSuperAdmin) {
      const { data: recordLocale } = await supabase
        .from('utenti_locale')
        .select('locale_id')
        .eq('user_id', user.id)
        .limit(1);

      haLocale = Boolean(recordLocale && recordLocale.length > 0);
    }

    if (!isSuperAdmin && !haLocale) {
      // Se non è collegato a nessun locale né è super admin, fai logout e rimanda a /admin/login
      await supabase.auth.signOut();
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('errore', 'Questo account non è collegato a nessun locale');
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // Protezione /super/*
  if (pathname.startsWith('/super')) {
    if (pathname === '/super/login') {
      if (user) {
        const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
          check_user_id: user.id,
        });
        if (isSuperAdmin) {
          return NextResponse.redirect(new URL('/super', request.url));
        }
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return response;
    }

    if (!user) {
      const loginUrl = new URL('/super/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verifica che l'utente sia super admin
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
      check_user_id: user.id,
    });

    if (!isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return response;
  }

  return response;
}

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

  return processAuthMiddleware(request, supabase as unknown as SupabaseAuthUserClient);
}

export const config = {
  matcher: ['/admin/:path*', '/super/:path*'],
};
