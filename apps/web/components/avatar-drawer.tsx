'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Settings, Link2, ChevronRight, LogOut, AlertCircle } from 'lucide-react';
import { useSessionStore } from '../stores/session-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { postJson } from '../lib/api';
import { RecoveryService } from '../lib/services';
import { Portal } from './portal';
import { LesionesScreen } from './lesiones-screen';

export function AvatarDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const clearUser   = useSessionStore((s) => s.clearUser);
  const { profile, injuries } = useRecoveryStore();
  const router = useRouter();

  const [isLoggingOut,      setIsLoggingOut]      = useState(false);
  const [showLesionesScreen, setShowLesionesScreen] = useState(false);

  const displayName = profile.name || sessionUser?.name || 'Usuario';
  const email       = sessionUser?.email ?? '';
  const initials    = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const activeCount = injuries.filter((i) => i.status === 'active' || i.status === 'recovering').length;

  async function logout() {
    setIsLoggingOut(true);
    try {
      await postJson('/auth/logout', {});
    } catch {
      // continue regardless
    } finally {
      RecoveryService.clearData();
      clearUser();
      setIsLoggingOut(false);
      onClose();
      router.push('/login');
    }
  }

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div
          className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg overflow-y-auto"
          style={{ maxHeight: '90vh' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          {/* User header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-5 border-b border-ink/5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-moss flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">{initials}</span>
              </div>
              <div>
                <p className="text-base font-bold text-ink">{displayName}</p>
                {email && <p className="text-xs text-ink/40 mt-0.5">{email}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-canvas-light flex items-center justify-center"
            >
              <X size={15} className="text-ink/60" />
            </button>
          </div>

          {/* Active goals */}
          {profile.activeGoals.length > 0 && (
            <div className="px-5 pt-4 pb-3 border-b border-ink/5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 mb-2">Objetivos</p>
              <div className="flex flex-wrap gap-2">
                {profile.activeGoals.map((g) => (
                  <span key={g} className="rounded-full bg-moss-light px-3 py-1 text-xs font-medium text-moss">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Injuries — tap to open full screen */}
          <button
            type="button"
            onClick={() => setShowLesionesScreen(true)}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-ink/5 text-left active:bg-canvas-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={15} className="text-ember" />
              <span className="text-sm text-ink">Lesiones</span>
              {activeCount > 0 && (
                <span className="text-xs font-semibold text-ember bg-orange-50 rounded-full px-2 py-0.5">
                  {activeCount} activa{activeCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ChevronRight size={14} className="text-ink/20" />
          </button>

          {/* Menu items */}
          <div className="px-5 py-2">
            {([
              { icon: Settings, label: 'Configuración' },
              { icon: Link2,    label: 'Conexiones'    },
            ] as const).map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="w-full flex items-center justify-between py-3.5 border-b border-ink/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Icon size={15} className="text-ink/40" />
                  <span className="text-sm text-ink">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ink/30 bg-sand/30 px-2 py-0.5 rounded-full">
                    próximamente
                  </span>
                  <ChevronRight size={14} className="text-ink/20" />
                </div>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div className="px-5 pb-8 pt-2">
            <button
              type="button"
              onClick={() => void logout()}
              disabled={isLoggingOut}
              className="w-full rounded-3xl bg-white shadow-card py-4 flex items-center justify-center gap-2 text-sm font-medium text-red-500 disabled:opacity-50"
            >
              <LogOut size={16} />
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </div>

      {showLesionesScreen && (
        <LesionesScreen onClose={() => setShowLesionesScreen(false)} />
      )}
    </Portal>
  );
}
