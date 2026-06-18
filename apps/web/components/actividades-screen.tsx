'use client';

import { useState } from 'react';
import { Activity, Bike, Dumbbell, Footprints, Waves, Zap, Clock, Plus } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { AddActivitySheet } from './add-activity-sheet';
import type { ActivityType } from '../stores/recovery-store';

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  gym:      Dumbbell,
  bike:     Bike,
  walk:     Footprints,
  swim:     Waves,
  run:      Activity,
  mobility: Zap,
  rehab:    Zap,
  other:    Activity,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  gym:      'Gym',
  bike:     'Bici',
  walk:     'Caminar',
  swim:     'Natación',
  run:      'Correr',
  mobility: 'Movilidad',
  rehab:    'Rehab',
  other:    'Otro',
};

type Filter = ActivityType | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',  label: 'Todo'      },
  { id: 'gym',  label: 'Gym'       },
  { id: 'bike', label: 'Bici'      },
  { id: 'walk', label: 'Caminar'   },
  { id: 'rehab',label: 'Rehab'     },
  { id: 'swim', label: 'Natación'  },
];

function relativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return d.toLocaleDateString('es-ES', { weekday: 'long' });
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function ActividadesScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const { activities } = useRecoveryStore();

  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = filter === 'all' ? sorted : sorted.filter((a) => a.type === filter);

  return (
    <>
    <div className="px-4 pt-4 pb-24 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-ink">Actividades</h1>
          <p className="text-sm text-ink/40">
            {activities.length === 0 ? 'Sin actividades' : `${activities.length} sesiones registradas`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-ink px-3.5 py-2 flex-shrink-0 mt-1"
        >
          <Plus size={13} className="text-white" />
          <span className="text-xs font-semibold text-white">Añadir</span>
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition-all duration-150 ${
              filter === f.id
                ? 'bg-ink text-white'
                : 'bg-white shadow-card text-ink/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <div className="rounded-4xl bg-canvas-light border border-sand/40 p-8 flex flex-col items-center gap-2 text-center">
          <Activity size={24} className="text-ink/20" />
          <p className="text-sm text-ink/40">
            {filter === 'all'
              ? 'Sin actividades registradas'
              : `Sin actividades de tipo ${ACTIVITY_LABELS[filter as ActivityType]}`}
          </p>
          <p className="text-xs text-ink/25">Pulsa + para añadir una actividad</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((act) => {
            const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
            return (
              <div key={act.id} className="rounded-3xl bg-white shadow-card p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-canvas flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{ACTIVITY_LABELS[act.type]}</p>
                    {act.durationMinutes && (
                      <span className="flex items-center gap-0.5 text-[11px] text-ink/40">
                        <Clock size={10} />
                        {act.durationMinutes}m
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-ink/40 capitalize">{relativeDate(act.date)}</span>
                    {act.notes && (
                      <>
                        <span className="text-ink/20">·</span>
                        <span className="text-xs text-ink/40 truncate">{act.notes}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    <AddActivitySheet isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
