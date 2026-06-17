'use client';

import { useMemo, useState } from 'react';
import { todayIso } from '../lib/date';
import type { ActivityType, DailyHabits } from '../stores/recovery-store';
import { useRecoveryStore } from '../stores/recovery-store';
import { Panel } from './ui/card';

const activityOptions: ActivityType[] = ['gym', 'bike', 'walk', 'swim', 'run', 'mobility', 'rehab', 'other'];

const defaultHabits: DailyHabits = {
  rehab: false,
  mobility: false,
  stretching: false,
  goodNutrition: false,
  enoughProtein: false,
};

export function DailyCheckInPanel() {
  const injuries = useRecoveryStore((state) => state.injuries.filter((injury) => injury.status !== 'resolved'));
  const saveDailyCheckIn = useRecoveryStore((state) => state.saveDailyCheckIn);
  const selectedDate = useRecoveryStore((state) => state.selectedDate);
  const [weightKg, setWeightKg] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<Record<string, { durationMinutes?: number; notes?: string }>>({});
  const [injuryState, setInjuryState] = useState<Record<string, { painLevel: number; didRehab: boolean; notes?: string }>>({});
  const [habits, setHabits] = useState<DailyHabits>(defaultHabits);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const date = selectedDate || todayIso();
  const preparedInjuries = useMemo(
    () =>
      injuries.map((injury) => ({
        ...injury,
        current: injuryState[injury.id] ?? { painLevel: 0, didRehab: false, notes: '' },
      })),
    [injuries, injuryState],
  );

  function toggleActivity(type: ActivityType) {
    setSelectedActivities((current) => {
      if (current[type]) {
        const next = { ...current };
        delete next[type];
        return next;
      }
      return { ...current, [type]: {} };
    });
  }

  function saveCheckIn() {
    saveDailyCheckIn({
      date,
      weightKg: weightKg ? Number(weightKg) : undefined,
      activities: Object.entries(selectedActivities).map(([type, value]) => ({
        type: type as ActivityType,
        durationMinutes: value.durationMinutes,
        notes: value.notes,
      })),
      injuryLogs: preparedInjuries.map((injury) => ({
        injuryId: injury.id,
        painLevel: injury.current.painLevel,
        didRehab: injury.current.didRehab,
        notes: injury.current.notes,
      })),
      habits,
      notes: notes || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Panel className="space-y-5 rounded-[32px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss">Daily Check-in</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">Tu dia en menos de 30 segundos</h3>
        </div>
        <div className="rounded-full bg-canvas px-3 py-2 text-xs text-ink/72">{date}</div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink">Peso</p>
        <input
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
          inputMode="decimal"
          placeholder="78.4"
          className="w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink">Actividades</p>
        <div className="flex flex-wrap gap-2">
          {activityOptions.map((activity) => (
            <button
              key={activity}
              type="button"
              onClick={() => toggleActivity(activity)}
              className={`rounded-full px-4 py-2 text-sm ${
                selectedActivities[activity] ? 'bg-ink text-white' : 'bg-canvas text-ink'
              }`}
            >
              {activity}
            </button>
          ))}
        </div>
        {Object.entries(selectedActivities).map(([type, value]) => (
          <div key={type} className="grid gap-2 rounded-2xl bg-canvas p-3 md:grid-cols-[120px_1fr]">
            <div className="text-sm font-medium capitalize text-ink">{type}</div>
            <div className="grid gap-2">
              <input
                inputMode="numeric"
                placeholder="minutos"
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                value={value.durationMinutes ?? ''}
                onChange={(event) =>
                  setSelectedActivities((current) => ({
                    ...current,
                    [type]: {
                      ...current[type],
                      durationMinutes: event.target.value ? Number(event.target.value) : undefined,
                    },
                  }))
                }
              />
              <input
                placeholder="notas"
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                value={value.notes ?? ''}
                onChange={(event) =>
                  setSelectedActivities((current) => ({
                    ...current,
                    [type]: {
                      ...current[type],
                      notes: event.target.value || undefined,
                    },
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink">Lesiones activas</p>
        <div className="space-y-3">
          {preparedInjuries.map((injury) => (
            <div key={injury.id} className="rounded-2xl bg-canvas p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{injury.name}</p>
                  <p className="text-xs text-ink/60">{injury.bodyPart ?? 'Sin body part'}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs capitalize text-ink/70">
                  {injury.status}
                </span>
              </div>
              <div className="mt-3 grid gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={injury.current.painLevel}
                  onChange={(event) =>
                    setInjuryState((current) => ({
                      ...current,
                      [injury.id]: {
                        ...current[injury.id],
                        painLevel: Number(event.target.value),
                        didRehab: current[injury.id]?.didRehab ?? false,
                      },
                    }))
                  }
                />
                <div className="text-sm text-ink/72">Dolor: {injury.current.painLevel}/10</div>
                <label className="flex items-center gap-2 text-sm text-ink/72">
                  <input
                    type="checkbox"
                    checked={injury.current.didRehab}
                    onChange={(event) =>
                      setInjuryState((current) => ({
                        ...current,
                        [injury.id]: {
                          ...current[injury.id],
                          painLevel: current[injury.id]?.painLevel ?? 0,
                          didRehab: event.target.checked,
                        },
                      }))
                    }
                  />
                  Rehab hecha
                </label>
                <input
                  placeholder="notas opcionales"
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                  value={injury.current.notes ?? ''}
                  onChange={(event) =>
                    setInjuryState((current) => ({
                      ...current,
                      [injury.id]: {
                        ...current[injury.id],
                        painLevel: current[injury.id]?.painLevel ?? 0,
                        didRehab: current[injury.id]?.didRehab ?? false,
                        notes: event.target.value || undefined,
                      },
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink">Habitos del dia</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(habits).map(([habit, value]) => (
            <button
              key={habit}
              type="button"
              onClick={() => setHabits((current) => ({ ...current, [habit]: !value }))}
              className={`rounded-2xl px-4 py-3 text-sm capitalize ${
                value ? 'bg-ink text-white' : 'bg-canvas text-ink'
              }`}
            >
              {habit}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink">Notas generales</p>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm"
          placeholder="Como te has sentido hoy"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={saveCheckIn}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
        >
          Guardar check-in
        </button>
        {saved ? <span className="text-sm text-moss">Guardado</span> : null}
      </div>
    </Panel>
  );
}

