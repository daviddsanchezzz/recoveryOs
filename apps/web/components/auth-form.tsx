'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJson } from '../lib/api';
import { useSessionStore } from '../stores/session-store';

type AuthFormProps = {
  mode: 'login' | 'register';
};

type RegisterResponse = {
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
  };
};

type LoginResponse = {
  redirect: boolean;
  token: string;
  url?: string;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
  };
};

export function AuthForm({ mode }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        const response = await postJson<RegisterResponse>('/auth/register', {
          email,
          password,
          name,
        });
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
        });
      } else {
        const response = await postJson<LoginResponse>('/auth/login', {
          email,
          password,
        });
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
        });
      }

      router.push('/app');
    } catch {
      setError('No se ha podido completar la autenticacion. Revisa API o credenciales.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-[32px] border border-black/10 bg-white/80 p-6 shadow-[0_12px_40px_rgba(19,32,26,0.08)]"
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">
          {mode === 'login' ? 'Login' : 'Registro'}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">
          {mode === 'login' ? 'Accede a tu app diaria' : 'Crea tu usuario primero'}
        </h1>
        <p className="text-sm leading-6 text-ink/72">
          {mode === 'login'
            ? 'Recuperacion, nutricion y seguimiento desde un panel personal.'
            : 'La PWA debe abrir ya sobre tu contexto, no sobre una landing anonima.'}
        </p>
      </div>
      {mode === 'register' ? (
        <input
          name="name"
          placeholder="Nombre"
          required
          className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
        />
      ) : null}
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
      >
        {isSubmitting ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
      </button>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
      <p className="text-sm text-ink/70">
        {mode === 'login' ? 'Aun no tienes cuenta?' : 'Ya tienes cuenta?'}{' '}
        <Link href={mode === 'login' ? '/register' : '/login'} className="font-medium text-ink">
          {mode === 'login' ? 'Registrate' : 'Entra'}
        </Link>
      </p>
    </form>
  );
}
