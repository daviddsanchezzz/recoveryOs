'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { postJson } from '../lib/api';
import { useSessionStore } from '../stores/session-store';

type AuthFormProps = { mode: 'login' | 'register' };

type RegisterResponse = {
  token: string | null;
  user: { id: string; email: string; name: string; image?: string | null; emailVerified: boolean };
};

type LoginResponse = {
  redirect: boolean;
  token: string;
  url?: string;
  user: { id: string; email: string; name: string; image?: string | null; emailVerified: boolean };
};

export function AuthForm({ mode }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const setUser = useSessionStore((state) => state.setUser);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const name = String(formData.get('name') ?? '');

    try {
      if (mode === 'register') {
        const response = await postJson<RegisterResponse>('/auth/register', { email, password, name });
        setUser({ id: response.user.id, email: response.user.email, name: response.user.name });
      } else {
        const response = await postJson<LoginResponse>('/auth/login', { email, password });
        setUser({ id: response.user.id, email: response.user.email, name: response.user.name });
      }
      router.push('/app');
    } catch {
      setError('No se pudo completar. Revisa tus credenciales o la conexión.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <div className="w-full max-w-sm mx-auto space-y-8 animate-slide-up">
      {/* Logo */}
      <div className="text-center space-y-3">
        <div className="mx-auto h-16 w-16 rounded-4xl bg-ink flex items-center justify-center shadow-card-lg">
          <span className="text-white font-bold text-2xl">R</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">RecoveryOS</h1>
          <p className="text-sm text-ink/40 mt-1">Track. Recover. Improve.</p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-4xl bg-white shadow-card-lg p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-ink">
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p className="text-sm text-ink/40">
            {isLogin
              ? 'Entra en tu panel de recuperación'
              : 'Empieza a recuperarte con datos reales'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink/40 uppercase tracking-wide">Nombre</label>
              <input
                name="name"
                placeholder="David"
                required
                className="w-full rounded-2xl bg-canvas border border-ink/8 px-4 py-3.5 text-sm text-ink placeholder:text-ink/30 outline-none focus:border-ink/30 transition-colors"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink/40 uppercase tracking-wide">Email</label>
            <input
              name="email"
              type="email"
              placeholder="tu@email.com"
              required
              className="w-full rounded-2xl bg-canvas border border-ink/8 px-4 py-3.5 text-sm text-ink placeholder:text-ink/30 outline-none focus:border-ink/30 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink/40 uppercase tracking-wide">Contraseña</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                className="w-full rounded-2xl bg-canvas border border-ink/8 px-4 py-3.5 pr-12 text-sm text-ink placeholder:text-ink/30 outline-none focus:border-ink/30 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-ember-light px-4 py-3">
              <p className="text-sm text-ember">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-ink py-4 text-sm font-semibold text-white disabled:opacity-50 transition-opacity mt-2"
          >
            {isSubmitting
              ? 'Procesando...'
              : isLogin
              ? 'Entrar'
              : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-ink/40">
          {isLogin ? '¿Sin cuenta aún?' : '¿Ya tienes cuenta?'}{' '}
          <Link
            href={isLogin ? '/register' : '/login'}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </Link>
        </p>
      </div>
    </div>
  );
}
