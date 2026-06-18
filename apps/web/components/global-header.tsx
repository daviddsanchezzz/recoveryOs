'use client';

import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useSessionStore } from '../stores/session-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { AvatarDrawer } from './avatar-drawer';
import { NotificationPanel } from './notification-panel';

export function GlobalHeader() {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [hasUnread, setHasUnread]   = useState(true);

  const user    = useSessionStore((s) => s.user);
  const profile = useRecoveryStore((s) => s.profile);

  const displayName = profile.name || user?.name || '';
  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'RO';

  function openNotif() {
    setNotifOpen(true);
    setHasUnread(false);
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-canvas/90 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto max-w-md relative flex items-center px-4 h-14">
          {/* Left: avatar + bell */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="h-9 w-9 rounded-full bg-moss flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Perfil"
            >
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </button>

            <button
              type="button"
              onClick={openNotif}
              className="relative h-9 w-9 rounded-full bg-white shadow-card flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Notificaciones"
            >
              <Bell size={15} className="text-ink/60" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-ember" />
              )}
            </button>
          </div>

          {/* Center: wordmark */}
          <p className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-ink tracking-tight pointer-events-none select-none">
            RecoveryOS
          </p>
        </div>
      </header>

      <AvatarDrawer   isOpen={avatarOpen} onClose={() => setAvatarOpen(false)} />
      <NotificationPanel isOpen={notifOpen}  onClose={() => setNotifOpen(false)} />
    </>
  );
}
