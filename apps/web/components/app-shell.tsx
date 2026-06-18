'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GlobalHeader }       from './global-header';
import { BottomNav }          from './bottom-nav';
import { TodayScreen }        from './today-screen';
import { PlanScreen }         from './plan-screen';
import { ActividadesScreen }  from './actividades-screen';
import { ProgressScreen }     from './progress-screen';
import { ChatPanel }          from './chat-panel';
import { useSessionStore }    from '../stores/session-store';
import { getJson }            from '../lib/api';
import { RecoveryService }    from '../lib/services';
import { todayIso }           from '../lib/date';
import type { TabId }         from './bottom-nav';

export function AppShell() {
  const [activeTab, setActiveTab]             = useState<TabId>('hoy');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const mainRef = useRef<HTMLElement>(null);

  function switchTab(id: TabId) {
    setActiveTab(id);
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }

  const user      = useSessionStore((state) => state.user);
  const setUser   = useSessionStore((state) => state.setUser);
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
          void RecoveryService.loadTodayData(session.user.id, todayIso());
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
      <GlobalHeader />

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-24 pt-14 scroll-smooth-ios"
      >
        {/* Chat gets h-full so its internal flex layout fills available space */}
        <div className={`mx-auto max-w-md ${activeTab === 'chat' ? 'h-full' : ''}`}>
          {activeTab === 'hoy'         && <TodayScreen />}
          {activeTab === 'plan'        && <PlanScreen />}
          {activeTab === 'actividades' && <ActividadesScreen />}
          {activeTab === 'progreso'    && <ProgressScreen />}
          {activeTab === 'chat'        && <ChatPanel />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={switchTab} />
    </div>
  );
}
