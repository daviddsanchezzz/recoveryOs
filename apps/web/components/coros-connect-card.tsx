'use client';

import { useEffect, useState } from 'react';
import { HeartPulse, RefreshCw, Unlink } from 'lucide-react';
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

export function CorosConnectCard({ hideIfSynced }: { hideIfSynced?: boolean }) {
  const user = useSessionStore((s) => s.user);
  const [status, setStatus] = useState<CorosStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

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
    <div className="rounded-3xl bg-white shadow-card px-4 py-3.5 flex items-center gap-3">
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
              ? status.lastSyncAt
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
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sync…' : 'Sync'}
            </button>
          )}
          <button
            type="button"
            onClick={handleDisconnect}
            className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30 hover:text-red-400 hover:bg-red-50 transition-colors"
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
  );
}
