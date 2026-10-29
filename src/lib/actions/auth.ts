'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Login con email e password.
 * Restituisce un oggetto con errore in italiano in caso di fallimento.
 */
export async function loginAction(
  email: string,
  password: string,
  redirectTo?: string
): Promise<{ errore: string } | never> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mappa gli errori Supabase in messaggi italiani
    if (error.message.includes('Invalid login credentials')) {
      return { errore: 'Email o password non corretti.' };
    }
    if (error.message.includes('Email not confirmed')) {
      return { errore: 'Email non confermata. Controlla la tua casella di posta.' };
    }
    if (error.message.includes('Too many requests')) {
      return { errore: 'Troppi tentativi. Riprova tra qualche minuto.' };
    }
    return { errore: `Errore di accesso: ${error.message}` };
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo || '/admin');
}

/**
 * Login super admin — verifica anche che l'utente sia effettivamente super admin.
 */
export async function loginSuperAction(
  email: string,
  password: string
): Promise<{ errore: string } | never> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { errore: 'Email o password non corretti.' };
    }
    return { errore: `Errore di accesso: ${error.message}` };
  }

  // Verifica che l'utente sia super admin
  const { data: isSuperAdmin } = await supabase
    .rpc('is_super_admin', { check_user_id: data.session?.user.id });

  if (!isSuperAdmin) {
    // Non è super admin: fai logout immediatamente
    await supabase.auth.signOut();
    return { errore: 'Accesso non autorizzato. Solo i super amministratori possono accedere.' };
  }

  revalidatePath('/', 'layout');
  redirect('/super');
}

/**
 * Logout: invalida la sessione e reindirizza al login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/admin/login');
}
