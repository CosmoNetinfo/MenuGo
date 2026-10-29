'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { BRAND_CONFIG } from '@/config/brand';
import { loginSuperAction } from '@/lib/actions/auth';

export default function SuperLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    startTransition(async () => {
      const result = await loginSuperAction(email, password);
      if (result && 'errore' in result) {
        setErrore(result.errore);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <span className="inline-block text-3xl font-extrabold text-white tracking-tight">
            {BRAND_CONFIG.name}
          </span>
          <p className="text-sm text-slate-400 mt-2">Pannello Super Amministratore</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-700 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Accesso riservato</h1>
          <p className="text-xs text-slate-500 mb-6">
            Solo i super amministratori di {BRAND_CONFIG.name} possono accedere.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 text-sm"
                placeholder="admin@esempio.it"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 text-sm"
                placeholder="••••••••"
              />
            </div>

            {errore && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
              >
                {errore}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition"
            >
              {isPending ? 'Verifica in corso…' : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link href="/" className="hover:text-slate-300 transition">
            ← Torna alla home
          </Link>
        </p>
      </div>
    </div>
  );
}
