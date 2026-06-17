'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChatPanel } from './chat-panel';
import { HomeScreen } from './home-screen';
import { ProgressScreen } from './progress-screen';
import { InsightsScreen } from './insights-screen';
import { ProfileScreen } from './profile-screen';
import { Panel } from './ui/card';
import { useSessionStore } from '../stores/session-store';
import { getJson } from '../lib/api';

const tabs = [
  { id: 'home', label: 'Home', eyebrow: 'RecoveryOS' },
  { id: 'chat', label: 'Chat', eyebrow: 'Quick Entry' },
  { id: 'progress', label: 'Progress', eyebrow: 'Tracking' },
  { id: 'insights', label: 'Insights', eyebrow: 'Weekly View' },
  { id: 'profile', label: 'Profile', eyebrow: 'Session' },
] as const;

export function AppShell() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('home');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      try {
        const session = await getJson<{
          session: {
            id: string;
            userId: string;
            expiresAt: string;
          };
          user: {
            id: string;
            email: string;
            name: string;
          };
        } | null>('/auth/session');

        if (cancelled) {
          return;
        }

        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
          });
        } else {
          clearUser();
        }
      } catch {
        if (!cancelled) {
          clearUser();
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    void syncSession();

    return () => {
      cancelled = true;
    };
  }, [clearUser, setUser]);

  if (isCheckingSession) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
        <Panel className="space-y-5 rounded-[36px]">
          <p className="text-xs uppercase tracking-[0.2em] text-moss">Sesion</p>
          <h1 className="text-3xl font-semibold leading-tight text-ink">Validando tu acceso</h1>
          <p className="text-base leading-7 text-ink/72">
            RecoveryOS debe abrir sobre tu sesion real, no sobre estado local stale.
          </p>
        </Panel>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
        <Panel className="space-y-5 rounded-[36px]">
          <p className="text-xs uppercase tracking-[0.2em] text-moss">Primero tu cuenta</p>
          <h1 className="text-4xl font-semibold leading-tight text-ink">
            Antes del dashboard necesitas crear tu usuario o entrar.
          </h1>
          <p className="text-base leading-7 text-ink/72">
            En una PWA personal la app debe abrir sobre tu contexto, no sobre datos demo.
          </p>
          <div className="flex gap-3">
            <Link
              href="/register"
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-ink"
            >
              Entrar
            </Link>
          </div>
        </Panel>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-canvas text-ink">
      <section className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-black/10 bg-canvas/95 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-moss">
                {tabs.find((tab) => tab.id === activeTab)?.eyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h2>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm text-ink/72">
              {user.name ?? user.email}
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 pb-28 pt-5">
          {activeTab === 'home' ? <HomeScreen /> : null}
          {activeTab === 'chat' ? <ChatPanel compact={false} /> : null}
          {activeTab === 'progress' ? <ProgressScreen /> : null}
          {activeTab === 'insights' ? <InsightsScreen /> : null}
          {activeTab === 'profile' ? <ProfileScreen /> : null}

          <Panel className="rounded-[32px] bg-[#efe4d2]/75">
            <p className="text-xs uppercase tracking-[0.2em] text-moss">V1</p>
            <p className="mt-2 text-sm leading-7 text-ink/72">
              Chat rapido, check-in diario, lesiones genericas, peso, actividad manual y progreso semanal.
            </p>
          </Panel>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 border-t border-black/10 bg-[#f5ede0]/95 p-3 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-2 py-3 text-xs font-medium ${
                  activeTab === tab.id ? 'bg-ink text-white' : 'bg-white text-ink/72'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </section>
    </main>
  );
}
