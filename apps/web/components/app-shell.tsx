'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Home, MessageCircle, TrendingUp, Sparkles, User } from 'lucide-react';
import { ChatPanel } from './chat-panel';
import { HomeScreen } from './home-screen';
import { ProgressScreen } from './progress-screen';
import { InsightsScreen } from './insights-screen';
import { ProfileScreen } from './profile-screen';
import { useSessionStore } from '../stores/session-store';
import { getJson } from '../lib/api';
import { RecoveryService } from '../lib/services';

type TabId = 'home' | 'chat' | 'progress' | 'insights' | 'profile';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'progress', label: 'Progreso', icon: TrendingUp },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'profile', label: 'Perfil', icon: User },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      try {
        const session = await getJson<{
          session: { id: string; userId: string; expiresAt: string };
          user: { id: string; email: string; name: string };
        } | null>('/auth/session');

        if (cancelled) return;

        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email, name: session.user.name });
          void RecoveryService.loadUserData(session.user.id);
        } else {
          clearUser();
        }
      } catch {
        if (!cancelled) clearUser();
      } finally {
        if (!cancelled) setIsCheckingSession(false);
      }
    }

    void syncSession();
    return () => { cancelled = true; };
  }, [clearUser, setUser]);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="text-center space-y-3 animate-fade-in">
          <div className="mx-auto h-12 w-12 rounded-3xl bg-ink flex items-center justify-center">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <p className="text-sm text-ink/50 font-medium">Cargando...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-sm space-y-6 animate-slide-up">
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 rounded-3xl bg-ink flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <h1 className="text-2xl font-bold text-ink">RecoveryOS</h1>
            <p className="text-sm text-ink/60">Track. Recover. Improve.</p>
          </div>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full rounded-2xl bg-ink py-4 text-center text-sm font-semibold text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="block w-full rounded-2xl bg-white py-4 text-center text-sm font-semibold text-ink border border-ink/10"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <main className="flex-1 overflow-y-auto pb-24 scroll-smooth-ios">
        <div className="mx-auto max-w-md">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'chat' && <ChatPanel />}
          {activeTab === 'progress' && <ProgressScreen />}
          {activeTab === 'insights' && <InsightsScreen />}
          {activeTab === 'profile' && <ProfileScreen />}
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-canvas-light/95 backdrop-blur-md shadow-bottom-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="flex flex-col items-center gap-1 py-2.5 px-1"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-ink' : 'bg-transparent'
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={isActive ? 'text-white' : 'text-ink/40'}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium leading-none transition-colors duration-200 ${
                    isActive ? 'text-ink' : 'text-ink/40'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
