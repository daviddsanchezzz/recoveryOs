'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '../stores/session-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { Panel } from './ui/card';
import { postJson } from '../lib/api';

export function ProfileScreen() {
  const sessionUser = useSessionStore((state) => state.user);
  const clearUser = useSessionStore((state) => state.clearUser);
  const { profile, setProfile, injuries, addInjury, updateInjury } = useRecoveryStore();
  const router = useRouter();

  const [name, setName] = useState(profile.name || sessionUser?.name || '');
  const [goals, setGoals] = useState(profile.activeGoals.join(', '));
  const [newInjuryName, setNewInjuryName] = useState('');
  const [newInjuryBodyPart, setNewInjuryBodyPart] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function saveProfile() {
    setProfile({
      name,
      activeGoals: goals
        .split(',')
        .map((goal) => goal.trim())
        .filter(Boolean),
    });
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
  }

  async function logout() {
    setIsLoggingOut(true);

    try {
      await postJson('/auth/logout', {});
    } catch {
    } finally {
      clearUser();
      setIsLoggingOut(false);
      router.push('/login');
    }
  }

  return (
    <div className="space-y-5">
      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Profile</p>
        <h3 className="text-2xl font-semibold text-ink">Tu cuenta y preferencias</h3>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre"
          className="w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm"
        />
        <textarea
          value={goals}
          onChange={(event) => setGoals(event.target.value)}
          rows={3}
          placeholder="Objetivos activos separados por coma"
          className="w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={saveProfile}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
        >
          Guardar perfil
        </button>
      </Panel>

      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Lesiones activas</p>
        <div className="space-y-3">
          {injuries.map((injury) => (
            <div key={injury.id} className="rounded-2xl bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{injury.name}</p>
                  <p className="text-sm text-ink/60">{injury.bodyPart ?? 'Sin body part'}</p>
                </div>
                <select
                  value={injury.status}
                  onChange={(event) =>
                    updateInjury(injury.id, {
                      status: event.target.value as 'active' | 'recovering' | 'resolved',
                    })
                  }
                  className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs"
                >
                  <option value="active">active</option>
                  <option value="recovering">recovering</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <input
            value={newInjuryName}
            onChange={(event) => setNewInjuryName(event.target.value)}
            placeholder="Nueva lesion"
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm"
          />
          <input
            value={newInjuryBodyPart}
            onChange={(event) => setNewInjuryBodyPart(event.target.value)}
            placeholder="Body part"
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={createInjury}
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-ink"
          >
            Anadir lesion
          </button>
        </div>
      </Panel>

      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Conexiones</p>
        <div className="space-y-3">
          {['Strava', 'Coros', 'OpenAI'].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl bg-canvas p-4 text-sm">
              <span>{item}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-ink/60">proximamente</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
        >
          {isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}
        </button>
      </Panel>
    </div>
  );
}
