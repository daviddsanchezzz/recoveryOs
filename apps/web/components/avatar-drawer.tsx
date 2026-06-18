'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Settings, Link2, ChevronRight, LogOut, Plus } from 'lucide-react';
import { useSessionStore } from '../stores/session-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { postJson } from '../lib/api';
import { Portal } from './portal';

export function AvatarDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const sessionUser = useSessionStore((s) => s.user);
  const clearUser = useSessionStore((s) => s.clearUser);
  const { profile, injuries, addInjury, updateInjury } = useRecoveryStore();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAddingInjury, setIsAddingInjury] = useState(false);
  const [newInjuryName, setNewInjuryName] = useState('');
  const [newInjuryBodyPart, setNewInjuryBodyPart] = useState('');

  const displayName = profile.name || sessionUser?.name || 'Usuario';
  const email = sessionUser?.email ?? '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function logout() {
    setIsLoggingOut(true);
    try {
      await postJson('/auth/logout', {});
    } catch {
      // continue regardless
    } finally {
      clearUser();
      setIsLoggingOut(false);
      onClose();
      router.push('/login');
    }
  }

  function createInjury() {
    if (!newInjuryName.trim()) return;
    addInjury({
      name: newInjuryName.trim(),
      bodyPart: newInjuryBodyPart.trim() || undefined,
      startDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      description: undefined,
    });
    setNewInjuryName('');
    setNewInjuryBodyPart('');
    setIsAddingInjury(false);
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
            <div className="px-5 pt-4 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 mb-2">Objetivos</p>
              <div className="flex flex-wrap gap-2">
                {profile.activeGoals.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-moss-light px-3 py-1 text-xs font-medium text-moss"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Injuries */}
          <div className="px-5 pt-3 pb-4 border-b border-ink/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Lesiones</p>
              <button
                type="button"
                onClick={() => setIsAddingInjury(!isAddingInjury)}
                className="h-6 w-6 rounded-lg bg-canvas-light flex items-center justify-center"
              >
                <Plus size={12} className="text-ink/60" />
              </button>
            </div>

            {isAddingInjury && (
              <div className="space-y-2 bg-white rounded-3xl p-4 shadow-card mb-2">
                <input
                  value={newInjuryName}
                  onChange={(e) => setNewInjuryName(e.target.value)}
                  placeholder="Nombre de la lesión"
                  className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink outline-none border border-ink/10"
                />
                <input
                  value={newInjuryBodyPart}
                  onChange={(e) => setNewInjuryBodyPart(e.target.value)}
                  placeholder="Zona (tobillo, rodilla...)"
                  className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink outline-none border border-ink/10"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={createInjury}
                    className="flex-1 rounded-2xl bg-ink py-2.5 text-sm font-medium text-white"
                  >
                    Añadir
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingInjury(false)}
                    className="rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink/60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {injuries.length === 0 && !isAddingInjury ? (
              <p className="text-sm text-ink/30">Sin lesiones registradas</p>
            ) : (
              <div className="space-y-0">
                {injuries.map((injury) => (
                  <div
                    key={injury.id}
                    className="flex items-center justify-between py-2.5 border-b border-ink/5 last:border-0 gap-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{injury.name}</p>
                      {injury.bodyPart && (
                        <p className="text-xs text-ink/40 capitalize">{injury.bodyPart}</p>
                      )}
                    </div>
                    <select
                      value={injury.status}
                      onChange={(e) =>
                        updateInjury(injury.id, {
                          status: e.target.value as 'active' | 'recovering' | 'resolved',
                        })
                      }
                      className="rounded-xl bg-canvas border border-ink/10 px-2.5 py-1.5 text-xs text-ink/60 outline-none"
                    >
                      <option value="active">Activa</option>
                      <option value="recovering">Recuperando</option>
                      <option value="resolved">Resuelta</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

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
    </Portal>
  );
}
