'use client';

import { useState } from 'react';
import {
  Activity, Bike, Dumbbell, Footprints, Waves, Zap,
  Plus, Clock, Flame, Heart, Mountain, Gauge, Bolt,
} from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { AddActivitySheet } from './add-activity-sheet';
import type { ActivityType, ActivityEntry } from '../stores/recovery-store';

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

const MUSCLE_LABELS: Record<string, string> = {
  pecho: 'Pecho', espalda: 'Espalda', biceps: 'Bíceps', triceps: 'Tríceps',
  hombro: 'Hombro', core: 'Core', pierna: 'Pierna', gluteo: 'Glúteo',
};

type Filter = ActivityType | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',  label: 'Todo'     },
  { id: 'gym',  label: 'Gym'      },
  { id: 'bike', label: 'Bici'     },
  { id: 'run',  label: 'Correr'   },
  { id: 'walk', label: 'Caminar'  },
  { id: 'swim', label: 'Natación' },
  { id: 'rehab',label: 'Rehab'    },
];

function relativeDate(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7)  return d.toLocaleDateString('es-ES', { weekday: 'long' });
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold text-ink/60">
      {label}
    </span>
  );
}

function Stat({ icon: Icon, value, unit, color = 'text-ink/50' }: {
  icon: React.ElementType; value: string | number; unit?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Icon size={11} className={color} />
      <span className="text-xs text-ink/60 font-medium">{value}{unit ? <span className="text-ink/35"> {unit}</span> : null}</span>
    </div>
  );
}

function ActivityCard({ act }: { act: ActivityEntry }) {
  const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
  const isRun  = act.type === 'run' || act.type === 'walk';
  const isBike = act.type === 'bike';
  const isSwim = act.type === 'swim';
  const isGym  = act.type === 'gym';

  return (
    <div className="rounded-3xl bg-white shadow-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-canvas flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-moss" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink">{ACTIVITY_LABELS[act.type]}</p>
            {act.stravaName && (
              <p className="text-xs text-ink/40 truncate">{act.stravaName}</p>
            )}
          </div>
          <p className="text-xs text-ink/40 capitalize mt-0.5">{relativeDate(act.date)}</p>
        </div>
        {act.stravaId && (
          <span className="text-[9px] font-bold text-orange-400 bg-orange-50 rounded-full px-2 py-0.5">
            STRAVA
          </span>
        )}
      </div>

      {/* Muscle groups (gym) */}
      {isGym && act.muscleGroups && act.muscleGroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {act.muscleGroups.map((m) => <Chip key={m} label={MUSCLE_LABELS[m] ?? m} />)}
        </div>
      )}

      {/* Stats grid */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {act.durationMinutes && (
          <Stat icon={Clock} value={act.durationMinutes} unit="min" />
        )}
        {/* Run/Walk */}
        {isRun && act.distanceKm && (
          <Stat icon={Gauge} value={act.distanceKm.toFixed(2)} unit="km" />
        )}
        {isRun && act.avgPaceSecPerKm && (
          <Stat icon={Activity} value={fmtPace(act.avgPaceSecPerKm)} />
        )}
        {isRun && act.elevationGainM && (
          <Stat icon={Mountain} value={act.elevationGainM} unit="m ↑" />
        )}
        {/* Bike */}
        {isBike && act.distanceKm && (
          <Stat icon={Gauge} value={act.distanceKm.toFixed(1)} unit="km" />
        )}
        {isBike && act.avgSpeedKmh && (
          <Stat icon={Activity} value={act.avgSpeedKmh.toFixed(1)} unit="km/h" />
        )}
        {isBike && act.elevationGainM && (
          <Stat icon={Mountain} value={act.elevationGainM} unit="m ↑" />
        )}
        {isBike && act.avgPowerW && (
          <Stat icon={Bolt} value={act.avgPowerW} unit="W" />
        )}
        {/* Swim */}
        {isSwim && act.distanceM && (
          <Stat icon={Gauge} value={act.distanceM} unit="m" />
        )}
        {/* Gym volume */}
        {isGym && act.totalVolumeKg && (
          <Stat icon={Dumbbell} value={act.totalVolumeKg.toLocaleString('es-ES')} unit="kg vol." />
        )}
        {/* Common */}
        {act.kcal && (
          <Stat icon={Flame} value={act.kcal} unit="kcal" color="text-orange-400" />
        )}
        {act.avgHeartRateBpm && (
          <Stat icon={Heart} value={act.avgHeartRateBpm} unit="bpm" color="text-red-400" />
        )}
      </div>

      {/* Notes */}
      {act.notes && (
        <p className="text-xs text-ink/40 leading-relaxed">{act.notes}</p>
      )}
    </div>
  );
}

export function ActividadesScreen() {
  const [filter,  setFilter]  = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const { activities } = useRecoveryStore();

  const sorted   = [...activities].sort((a, b) => b.date.localeCompare(a.date));
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
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-ink px-3.5 py-2 flex-shrink-0 mt-1">
            <Plus size={13} className="text-white" />
            <span className="text-xs font-semibold text-white">Añadir</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold transition-all duration-150 ${
                filter === f.id ? 'bg-ink text-white' : 'bg-white shadow-card text-ink/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
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
          <div className="space-y-3">
            {filtered.map((act) => <ActivityCard key={act.id} act={act} />)}
          </div>
        )}
      </div>

      <AddActivitySheet isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
