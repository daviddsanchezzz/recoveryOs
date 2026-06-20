'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Unlink, Zap } from 'lucide-react';
import { useSessionStore } from '../stores/session-store';
import { getJson, postJson, deleteJson } from '../lib/api';
import { toast } from '../stores/toast-store';
import { RecoveryService } from '../lib/services';

type StravaStatus = { connected: boolean; lastSyncAt: string | null };

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'hace un momento';
  if (mins < 60)  return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function StravaConnectCard({ onSynced }: { onSynced?: () => void }) {
  const user = useSessionStore((s) => s.user);
  const [status,  setStatus]  = useState<StravaStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function loadStatus() {
    if (!user) return;
    try {
      const s = await getJson<StravaStatus>(`/strava/${user.id}/status`);
      setStatus(s);
    } catch {
      setStatus({ connected: false, lastSyncAt: null });
    }
  }

  useEffect(() => {
    void loadStatus();

    // Handle redirect back from Strava OAuth
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stravaParam = params.get('strava');
      if (stravaParam === 'connected') {
        toast.success('Strava conectado correctamente');
        void loadStatus();
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (stravaParam === 'error') {
        toast.error('No se pudo conectar Strava');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await postJson<{ synced: number }>('/strava/sync', {});
      toast.success(`${result.synced} actividades sincronizadas desde Strava`);
      await loadStatus();
      // Reload activities list
      if (user) {
        void RecoveryService.loadActivitiesPage(user.id);
        onSynced?.();
      }
    } catch {
      toast.error('Error al sincronizar con Strava');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    try {
      await deleteJson('/strava/disconnect');
      setStatus({ connected: false, lastSyncAt: null });
      toast.success('Strava desconectado');
    } catch {
      toast.error('Error al desconectar Strava');
    }
  }

  if (!status) return null;

  return (
    <div className="rounded-3xl bg-white shadow-card px-4 py-3.5 flex items-center gap-3">
      {/* Strava logo / icon */}
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        status.connected ? 'bg-[#FC4C02]/10' : 'bg-canvas'
      }`}>
        <Zap size={16} className={status.connected ? 'text-[#FC4C02]' : 'text-ink/30'} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-snug">Strava</p>
        <p className="text-[11px] text-ink/40 mt-0.5">
          {status.connected
            ? status.lastSyncAt
              ? `Última sync ${relativeTime(status.lastSyncAt)}`
              : 'Conectado · sin sincronizar'
            : 'Conecta para importar actividades'}
        </p>
      </div>

      {status.connected ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-2xl bg-[#FC4C02] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync…' : 'Sync'}
          </button>
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
          href="/api/strava/connect"
          className="flex items-center gap-1.5 rounded-2xl bg-[#FC4C02] px-3 py-2 text-xs font-semibold text-white flex-shrink-0"
        >
          <Zap size={12} />
          Conectar
        </a>
      )}
    </div>
  );
}
