'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Target, Activity, LogOut, Plus, ChevronRight } from 'lucide-react';
import { useSessionStore } from '../stores/session-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { postJson } from '../lib/api';
import { StravaConnectCard } from './strava-connect-card';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1 pt-2">
      {children}
    </p>
  );
}

function RowItem({
  label,
  value,
  onClick,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-1 border-b border-ink/5 last:border-0 active:bg-canvas-light transition-colors"
    >
      <span className="text-sm text-ink">{label}</span>
      <div className="flex items-center gap-1.5">
        {value && <span className="text-sm text-ink/40">{value}</span>}
        <ChevronRight size={14} className="text-ink/20" />
      </div>
    </button>
  );
}

export function ProfileScreen() {
  const sessionUser = useSessionStore((state) => state.user);
  const clearUser = useSessionStore((state) => state.clearUser);
  const { profile, setProfile, injuries, addInjury, updateInjury } = useRecoveryStore();
  const router = useRouter();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [isAddingInjury, setIsAddingInjury] = useState(false);
  const [name, setName] = useState(profile.name || sessionUser?.name || '');
  const [goals, setGoals] = useState(profile.activeGoals.join(', '));
  const [newInjuryName, setNewInjuryName] = useState('');
  const [newInjuryBodyPart, setNewInjuryBodyPart] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = profile.name || sessionUser?.name || 'David';
  const initials = displayName.slice(0, 2).toUpperCase();

  function saveProfile() {
    setProfile({
      name,
      activeGoals: goals.split(',').map((g) => g.trim()).filter(Boolean),
    });
    setIsEditingName(false);
    setIsEditingGoals(false);
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

  async function logout() {
    setIsLoggingOut(true);
    try {
      await postJson('/auth/logout', {});
    } catch {
      // continue
    } finally {
      clearUser();
      setIsLoggingOut(false);
      router.push('/login');
    }
  }

  return (
    <div className="px-4 pt-12 pb-4 space-y-5 animate-fade-in">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4 py-2">
        <div className="h-16 w-16 rounded-3xl bg-ink flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">{initials}</span>
        </div>
        <div>
          <p className="text-xl font-bold text-ink">{displayName}</p>
          <p className="text-sm text-ink/40">{sessionUser?.email}</p>
        </div>
      </div>

      {/* Personal */}
      <div className="rounded-4xl bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/5 flex items-center gap-2">
          <User size={15} className="text-ink/40" />
          <p className="text-sm font-semibold text-ink">Personal</p>
        </div>
        <div className="px-5">
          {isEditingName ? (
            <div className="py-3 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink outline-none border border-ink/10"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="flex-1 rounded-2xl bg-ink py-2.5 text-sm font-medium text-white"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink/60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <RowItem label="Nombre" value={displayName} onClick={() => setIsEditingName(true)} />
          )}
          <RowItem label="Email" value={sessionUser?.email} />
        </div>
      </div>

      {/* Goals */}
      <div className="rounded-4xl bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/5 flex items-center gap-2">
          <Target size={15} className="text-ink/40" />
          <p className="text-sm font-semibold text-ink">Objetivos activos</p>
        </div>
        <div className="px-5 py-3 space-y-2">
          {isEditingGoals ? (
            <div className="space-y-2">
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
                placeholder="Objetivos separados por coma"
                className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink outline-none border border-ink/10 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveProfile}
                  className="flex-1 rounded-2xl bg-ink py-2.5 text-sm font-medium text-white"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingGoals(false)}
                  className="rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink/60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {profile.activeGoals.length > 0 ? (
                <div className="flex flex-wrap gap-2 py-1">
                  {profile.activeGoals.map((goal) => (
                    <span key={goal} className="rounded-full bg-moss-light px-3 py-1 text-xs font-medium text-moss">
                      {goal}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/30 py-1">Sin objetivos definidos</p>
              )}
              <button
                type="button"
                onClick={() => setIsEditingGoals(true)}
                className="text-xs text-ember font-medium py-1"
              >
                Editar objetivos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Injuries */}
      <div className="rounded-4xl bg-white shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-ink/40" />
            <p className="text-sm font-semibold text-ink">Lesiones</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingInjury(!isAddingInjury)}
            className="h-7 w-7 rounded-xl bg-canvas flex items-center justify-center"
          >
            <Plus size={14} className="text-ink" />
          </button>
        </div>

        {isAddingInjury && (
          <div className="px-5 py-3 border-b border-ink/5 space-y-2">
            <input
              value={newInjuryName}
              onChange={(e) => setNewInjuryName(e.target.value)}
              placeholder="Nombre de la lesión"
              className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm outline-none border border-ink/10"
            />
            <input
              value={newInjuryBodyPart}
              onChange={(e) => setNewInjuryBodyPart(e.target.value)}
              placeholder="Zona (tobillo, rodilla...)"
              className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm outline-none border border-ink/10"
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

        <div className="px-5">
          {injuries.length === 0 ? (
            <p className="text-sm text-ink/30 py-4">Sin lesiones registradas</p>
          ) : (
            injuries.map((injury) => (
              <div key={injury.id} className="flex items-center justify-between py-3 border-b border-ink/5 last:border-0 gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">{injury.name}</p>
                  <p className="text-xs text-ink/40 capitalize">{injury.bodyPart ?? 'sin zona'}</p>
                </div>
                <select
                  value={injury.status}
                  onChange={(e) =>
                    updateInjury(injury.id, { status: e.target.value as 'active' | 'recovering' | 'resolved' })
                  }
                  className="rounded-xl bg-canvas border border-ink/10 px-2.5 py-1.5 text-xs text-ink/60 outline-none"
                >
                  <option value="active">Activa</option>
                  <option value="recovering">Recuperando</option>
                  <option value="resolved">Resuelta</option>
                </select>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Connections */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1 pt-2">
          Conexiones
        </p>
        <StravaConnectCard />
        <div className="rounded-4xl bg-white shadow-card overflow-hidden">
          <div className="px-5">
            {['Coros', 'OpenAI'].map((item) => (
              <div key={item} className="flex items-center justify-between py-3 border-b border-ink/5 last:border-0">
                <span className="text-sm text-ink/60">{item}</span>
                <span className="rounded-full bg-sand/30 px-2.5 py-0.5 text-[10px] font-medium text-ink/30">
                  próximamente
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logout */}
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
  );
}
