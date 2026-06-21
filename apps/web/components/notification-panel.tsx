'use client';

import { Bell, Dumbbell, X, BellOff, BellRing, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Portal } from './portal';
import { getJson, postJson } from '../lib/api';
import { enablePushNotifications, disablePushNotifications, getPushPermission } from '../lib/push';

type ServerNotif = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  createdAt: string;
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Ahora';
  if (m < 60)  return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  return `Hace ${d}d`;
}

export function NotificationPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [notifs, setNotifs]         = useState<ServerNotif[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy]     = useState(false);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    void getJson<ServerNotif[]>('/push/notifications')
      .then((data) => setNotifs(data ?? []))
      .finally(() => setLoading(false));

    void getPushPermission().then((p) => setPushEnabled(p === 'granted'));
  }, [isOpen]);

  async function handleClose() {
    if (notifs.some((n) => !n.read)) {
      await postJson('/push/notifications/mark-read', {});
    }
    onClose();
  }

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePushNotifications();
        setPushEnabled(false);
      } else {
        const ok = await enablePushNotifications();
        setPushEnabled(ok);
      }
    } finally {
      setPushBusy(false);
    }
  }

  if (!isOpen) return null;

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div
          className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-hidden"
          style={{ maxHeight: '80vh' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="flex items-center justify-between px-5 pt-3 pb-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-ink" />
              <p className="text-base font-bold text-ink">Notificaciones</p>
              {unread > 0 && (
                <span className="text-xs font-semibold bg-ember text-white rounded-full px-1.5 py-0.5">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePush}
                disabled={pushBusy}
                title={pushEnabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center active:scale-95 transition-transform"
              >
                {pushBusy
                  ? <Loader2 size={15} className="text-ink/60 animate-spin" />
                  : pushEnabled
                    ? <BellRing size={15} className="text-moss" />
                    : <BellOff  size={15} className="text-ink/40" />
                }
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center"
              >
                <X size={15} className="text-ink/60" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto pb-8 px-4 space-y-2">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-ink/30" />
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="text-center py-10">
                <Bell size={32} className="mx-auto text-ink/20 mb-2" />
                <p className="text-sm text-ink/40">Sin notificaciones</p>
                {!pushEnabled && (
                  <button
                    type="button"
                    onClick={togglePush}
                    className="mt-4 text-xs font-semibold text-moss underline underline-offset-2"
                  >
                    Activar notificaciones push
                  </button>
                )}
              </div>
            )}

            {!loading && notifs.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-3 rounded-2xl ${
                  notif.read ? 'bg-canvas-light/60' : 'bg-white shadow-card'
                }`}
              >
                <div className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center bg-moss-light">
                  <Dumbbell size={16} className="text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${notif.read ? 'text-ink/50' : 'text-ink font-medium'}`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-ink/50 mt-0.5 truncate">{notif.body}</p>
                  )}
                  <p className="text-xs text-ink/30 mt-0.5">{relTime(notif.createdAt)}</p>
                </div>
                {!notif.read && (
                  <div className="flex-shrink-0 h-2 w-2 rounded-full bg-ember mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  );
}
