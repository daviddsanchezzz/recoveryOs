'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, HeartPulse, RefreshCw, Unlink } from 'lucide-react';
import { useSessionStore } from '../stores/session-store';
import { getJson, postJson, deleteJson } from '../lib/api';
import { toast } from '../stores/toast-store';

type CorosStatus = {
  connected: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  syncError: string | null;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function CorosConnectCard({ hideIfSynced }: { hideIfSynced?: boolean }) {
  const user = useSessionStore((s) => s.user);
  const [status, setStatus] = useState<CorosStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [fromDate, setFromDate] = useState(() => isoDaysAgo(30));
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  async function loadStatus() {
    if (!user) return;
    try {
      const s = await getJson<CorosStatus>(`/coros/${user.id}/status`);
      setStatus(s);
    } catch {
      setStatus({ connected: false, lastSyncAt: null, syncStatus: null, syncError: null });
    }
  }

  useEffect(() => {
    void loadStatus();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const corosParam = params.get('coros');
      if (corosParam === 'connected') {
        toast.success('Coros conectado correctamente');
        void loadStatus();
        window.history.replaceState({}, '', window.location.pathname);
      } else if (corosParam === 'error') {
        toast.error('No se pudo conectar Coros');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSync() {
    setSyncing(true);
    setSyncProgress(null);
    try {
      const result = await postJson<{ synced: string[]; errors: string[] }>('/coros/sync', {});
      if (result.errors.length > 0) {
        toast.error(`Coros sincronizado con avisos: ${result.errors.join('; ')}`);
      } else {
        toast.success('Coros sincronizado');
      }
      await loadStatus();
    } catch {
      toast.error('Error al sincronizar con Coros');
    } finally {
      setSyncing(false);
    }
  }

  async function handleHistorySync() {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(`${fromDate}T00:00:00.000Z`);
    const end = new Date(`${today}T00:00:00.000Z`);

    if (!fromDate || Number.isNaN(start.getTime()) || start > end) {
      toast.error('Selecciona una fecha inicial válida');
      return;
    }

    const dates: string[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      dates.push(cursor.toISOString().slice(0, 10));
    }

    setSyncing(true);
    setSyncProgress({ current: 0, total: dates.length });
    let warningCount = 0;
    let completed = 0;

    try {
      for (const [index, date] of dates.entries()) {
        const result = await postJson<{ synced: string[]; errors: string[] }>('/coros/sync', { date });
        warningCount += result.errors.length;
        completed = index + 1;
        setSyncProgress({ current: completed, total: dates.length });
      }

      if (warningCount > 0) {
        toast.error(`Historial sincronizado con ${warningCount} avisos`);
      } else {
        toast.success(`${completed} días de COROS sincronizados`);
      }
      await loadStatus();
    } catch {
      toast.error(`Sincronización detenida tras ${completed} de ${dates.length} días`);
      await loadStatus();
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }

  async function handleDisconnect() {
    try {
      await deleteJson('/coros/disconnect');
      setStatus({ connected: false, lastSyncAt: null, syncStatus: null, syncError: null });
      toast.success('Coros desconectado');
    } catch {
      toast.error('Error al desconectar Coros');
    }
  }

  if (!status) return null;
  if (hideIfSynced && status.lastSyncAt !== null) return null;

  const needsReauth = status.syncStatus === 'reauth_required';

  return (
    <div className="rounded-3xl bg-white shadow-card px-4 py-3.5">
      <div className="flex items-center gap-3">
        {/* Coros logo (wordmark lockup — wider slot than a plain icon) */}
        <img
          src="/logos/coros.png"
          alt="Coros"
          className={`h-10 w-16 object-contain flex-shrink-0 transition-opacity ${status.connected ? '' : 'opacity-35'}`}
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug">Coros</p>
          <p className="text-[11px] text-ink/40 mt-0.5">
            {needsReauth
              ? 'Sesión caducada · reconecta'
              : status.connected
                ? syncProgress
                  ? `Sincronizando ${syncProgress.current}/${syncProgress.total} días`
                  : status.lastSyncAt
                    ? `Última sync ${relativeTime(status.lastSyncAt)}`
                    : 'Conectado · sin sincronizar'
                : 'Conecta para importar sueño, HRV y FC en reposo'}
          </p>
        </div>

        {status.connected ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            {needsReauth ? (
              <a
                href="/api/coros/connect"
                className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white flex-shrink-0"
              >
                <HeartPulse size={12} />
                Reconectar
              </a>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowHistory((show) => !show)}
                  disabled={syncing}
                  aria-expanded={showHistory}
                  className="h-8 rounded-xl bg-canvas px-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink/50 disabled:opacity-50 hover:text-moss transition-colors"
                >
                  <CalendarDays size={13} />
                  Historial
                </button>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                >
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sync…' : 'Sync'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={syncing}
              className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30 disabled:opacity-50 hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <Unlink size={13} />
            </button>
          </div>
        ) : (
          <a
            href="/api/coros/connect"
            className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white flex-shrink-0"
          >
            <HeartPulse size={12} />
            Conectar
          </a>
        )}
      </div>

      {status.connected && !needsReauth && showHistory && (
        <div className="mt-3 pt-3 border-t border-ink/5 flex items-end gap-2">
          <label className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1">
              Sincronizar desde
            </span>
            <input
              type="date"
              value={fromDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setFromDate(event.target.value)}
              disabled={syncing}
              className="w-full rounded-xl bg-canvas border border-ink/8 px-3 py-2 text-xs text-ink outline-none disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            onClick={handleHistorySync}
            disabled={syncing || !fromDate}
            className="rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
          >
            {syncProgress ? `${syncProgress.current}/${syncProgress.total}` : 'Hasta hoy'}
          </button>
        </div>
      )}
    </div>
  );
}
