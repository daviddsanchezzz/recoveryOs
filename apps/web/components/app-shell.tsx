'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GlobalHeader }       from './global-header';
import { BottomNav }          from './bottom-nav';
import { TodayScreen }        from './today-screen';
import { PlanScreen }         from './plan-screen';
import { ActividadesScreen }  from './actividades-screen';
import { ProgressScreen }     from './progress-screen';
import { ChatPanel }          from './chat-panel';
import { ToastContainer }     from './toast-container';
import { useSessionStore }    from '../stores/session-store';
import { useChatStore }       from '../stores/chat-store';
import { getJson }            from '../lib/api';
import { RecoveryService, CorosService, NutritionService } from '../lib/services';
import { useRecoveryStore } from '../stores/recovery-store';
import { usePullToRefresh } from '../lib/use-pull-to-refresh';
import { todayIso }           from '../lib/date';
import { registerServiceWorker } from '../lib/push';
import type { TabId }         from './bottom-nav';

export function AppShell() {
  const [activeTab, setActiveTab]             = useState<TabId>('hoy');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const redirectToLogin = useCallback(() => router.replace('/login'), [router]);

  function switchTab(id: TabId) {
    setActiveTab(id);
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }

  const user      = useSessionStore((state) => state.user);
  const setUser   = useSessionStore((state) => state.setUser);
  const clearUser = useSessionStore((state) => state.clearUser);

  useEffect(() => { void registerServiceWorker(); }, []);

  const { pull, refreshing } = usePullToRefresh(mainRef, activeTab === 'hoy' && !!user, async () => {
    const uid = useSessionStore.getState().user?.id;
    if (!uid) return;
    const date = useRecoveryStore.getState().selectedDate;
    await Promise.allSettled([
      CorosService.syncNow(uid, date),
      NutritionService.fetchDailySummary(uid, date),
    ]);
  });

  function askAgent(prompt: string) {
    useChatStore.getState().setPendingPrompt(prompt);
    switchTab('chat');
  }

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
          void CorosService.syncIfStale(session.user.id);
          void NutritionService.fetchGoal().catch(() => {});
        } else {
          // The server answered and there is really no session.
          clearUser();
        }
      } catch {
        // Network / server hiccup (e.g. opening the app on a weak connection or while the API
        // restarts): that says nothing about the session, so keep whoever was already signed in.
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
    return <RedirectToLogin onRedirect={redirectToLogin} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <GlobalHeader />

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto pb-24 pt-14 scroll-smooth-ios"
      >
        {(pull > 0 || refreshing) && (
          <div
            className="flex justify-center overflow-hidden text-xs font-medium text-ink/50"
            style={{ height: refreshing ? 36 : pull }}
          >
            <span className="self-center">
              {refreshing ? 'Actualizando…' : pull >= 64 ? 'Suelta para actualizar' : 'Desliza para actualizar'}
            </span>
          </div>
        )}
        {/* Chat gets h-full so its internal flex layout fills available space */}
        <div className={`mx-auto max-w-md ${activeTab === 'chat' ? 'h-full' : ''}`}>
          {activeTab === 'hoy'         && <TodayScreen onNavToActividades={() => switchTab('actividades')} onNavToProgreso={() => switchTab('progreso')} onNavToPlan={() => switchTab('plan')} onAskAgent={askAgent} />}
          {activeTab === 'plan'        && <PlanScreen />}
          {activeTab === 'actividades' && <ActividadesScreen />}
          {activeTab === 'progreso'    && <ProgressScreen onNavToActividades={() => switchTab('actividades')} />}
          {activeTab === 'chat'        && <ChatPanel />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={switchTab} />
      <ToastContainer />
    </div>
  );
}

/** No session: go straight to the login form (with a plain link as fallback). */
function RedirectToLogin({ onRedirect }: { onRedirect: () => void }) {
  useEffect(() => { onRedirect(); }, [onRedirect]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="text-center space-y-3">
        <p className="text-sm text-ink/60">Redirigiendo al inicio de sesión…</p>
        <Link href="/login" className="text-sm font-semibold text-ink underline">Ir a iniciar sesión</Link>
      </div>
    </main>
  );
}
