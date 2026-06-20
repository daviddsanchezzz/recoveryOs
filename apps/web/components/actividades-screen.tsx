'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SportShoe, Bike, Dumbbell, Footprints, Waves, RefreshCw, LayoutGrid, Activity,
  Plus, Clock, Flame, Heart, Mountain, Gauge, Bolt, Loader2,
  MoreHorizontal, Pencil, Trash2,
} from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import { RecoveryService } from '../lib/services';
import { AddActivitySheet } from './add-activity-sheet';
import type { ActivityType, ActivityEntry } from '../stores/recovery-store';

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  gym:      Dumbbell,
  bike:     Bike,
  walk:     Footprints,
  swim:     Waves,
  run:      SportShoe,
  mobility: RefreshCw,
  other:    MoreHorizontal,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  gym:      'Gym',
  bike:     'Bici',
  walk:     'Caminar',
  swim:     'Natación',
  run:      'Correr',
  mobility: 'Movilidad',
  other:    'Otro',
};

const MUSCLE_LABELS: Record<string, string> = {
  pecho: 'Pecho', espalda: 'Espalda', biceps: 'Bíceps', triceps: 'Tríceps',
  hombro: 'Hombro', core: 'Core', pierna: 'Pierna', gluteo: 'Glúteo',
};

type Filter = ActivityType | 'all';

const FILTERS: { id: Filter; label: string; Icon: React.ElementType }[] = [
  { id: 'all',  label: 'Todo',     Icon: LayoutGrid },
  { id: 'gym',  label: 'Gym',      Icon: Dumbbell   },
  { id: 'bike', label: 'Bici',     Icon: Bike       },
  { id: 'run',  label: 'Correr',   Icon: SportShoe      },
  { id: 'walk', label: 'Caminar',  Icon: Footprints },
  { id: 'swim', label: 'Natación', Icon: Waves      },
];

function relativeDate(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  const month   = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(weekday)}, ${d.getDate()} ${cap(month)}`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function Stat({ icon: Icon, value, unit, color = 'text-ink/40' }: {
  icon: React.ElementType; value: string | number; unit?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Icon size={11} className={color} />
      <span className="text-xs text-ink/60 font-medium tabular-nums">
        {value}{unit ? <span className="text-ink/35"> {unit}</span> : null}
      </span>
    </div>
  );
}

export function ActivityCard({
  act,
  onEdit,
  onDelete,
}: {
  act: ActivityEntry;
  onEdit: (act: ActivityEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
  const isRun  = act.type === 'run' || act.type === 'walk';
  const isBike = act.type === 'bike';
  const isSwim = act.type === 'swim';
  const isGym  = act.type === 'gym';

  return (
    <div className="rounded-3xl bg-white shadow-card px-4 py-3.5 flex items-start gap-3">
      {/* Icon */}
      <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-moss" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink leading-snug">{ACTIVITY_LABELS[act.type]}</p>
              {act.stravaId && (
                <span className="text-[9px] font-bold text-orange-400 bg-orange-50 rounded-full px-1.5 py-0.5 flex-shrink-0">
                  STRAVA
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-[11px] text-ink/35 leading-tight">
                {relativeDate(act.date)}{act.stravaName ? ` · ${act.stravaName}` : ''}
              </span>
              {isGym && act.muscleGroups?.map((m) => (
                <span key={m} className="text-[9px] font-bold text-moss bg-moss/20 rounded-full px-2 py-0.5 leading-none tracking-wide">
                  {MUSCLE_LABELS[m] ?? m}
                </span>
              ))}
            </div>
          </div>

          {/* 3-dot menu */}
          <div ref={menuRef} className="relative flex-shrink-0 -mt-0.5 -mr-1.5">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="h-7 w-7 flex items-center justify-center rounded-xl text-ink/25 hover:text-ink/50 hover:bg-canvas transition-colors"
            >
              <MoreHorizontal size={15} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white rounded-2xl shadow-card-lg border border-ink/5 overflow-hidden min-w-[130px]">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEdit(act); }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-canvas transition-colors"
                >
                  <Pencil size={13} className="text-ink/40" />
                  Editar
                </button>
                <div className="h-px bg-ink/5 mx-3" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDelete(act.id); }}
                  className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {act.durationMinutes && (
            <Stat icon={Clock} value={fmtDuration(act.durationMinutes)} />
          )}
          {isRun && act.distanceKm && (
            <Stat icon={Gauge} value={act.distanceKm.toFixed(2)} unit="km" />
          )}
          {isRun && act.avgPaceSecPerKm && (
            <Stat icon={Activity} value={fmtPace(act.avgPaceSecPerKm)} />
          )}
          {isRun && act.elevationGainM && (
            <Stat icon={Mountain} value={act.elevationGainM} unit="m↑" />
          )}
          {isBike && act.distanceKm && (
            <Stat icon={Gauge} value={act.distanceKm.toFixed(1)} unit="km" />
          )}
          {isBike && act.avgSpeedKmh && (
            <Stat icon={Activity} value={act.avgSpeedKmh.toFixed(1)} unit="km/h" />
          )}
          {isBike && act.elevationGainM && (
            <Stat icon={Mountain} value={act.elevationGainM} unit="m↑" />
          )}
          {isBike && act.avgPowerW && (
            <Stat icon={Bolt} value={act.avgPowerW} unit="W" />
          )}
          {isSwim && act.distanceM && (
            <Stat icon={Gauge} value={act.distanceM} unit="m" />
          )}
          {isGym && act.totalVolumeKg && (
            <Stat icon={Dumbbell} value={act.totalVolumeKg.toLocaleString('es-ES')} unit="kg" />
          )}
          {act.kcal && (
            <Stat icon={Flame} value={act.kcal} unit="kcal" color="text-orange-400" />
          )}
          {act.avgHeartRateBpm && (
            <Stat icon={Heart} value={act.avgHeartRateBpm} unit="bpm" color="text-red-400" />
          )}
        </div>

        {act.notes && (
          <p className="text-[11px] text-ink/35 leading-relaxed">{act.notes}</p>
        )}
      </div>
    </div>
  );
}

export function ActividadesScreen() {
  const [filter,       setFilter]       = useState<Filter>('all');
  const [showAdd,      setShowAdd]      = useState(false);
  const [editActivity, setEditActivity] = useState<ActivityEntry | undefined>(undefined);
  const [loadingMore,  setLoadingMore]  = useState(false);

  const { activities, activitiesMeta } = useRecoveryStore();
  const user = useSessionStore((s) => s.user);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load first page on first visit
  useEffect(() => {
    if (!activitiesMeta.loaded && user) {
      setLoadingMore(true);
      void RecoveryService.loadActivitiesPage(user.id).finally(() => setLoadingMore(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Infinite scroll: watch sentinel div
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && activitiesMeta.hasMore && !loadingMore && activitiesMeta.loaded && user) {
          setLoadingMore(true);
          void RecoveryService.loadActivitiesPage(user.id, activitiesMeta.nextCursor ?? undefined)
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activitiesMeta, loadingMore, user]);

  const sorted   = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = filter === 'all' ? sorted : sorted.filter((a) => a.type === filter);

  return (
    <>
      <div className="px-4 pt-4 pb-24 space-y-4 animate-fade-in">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-ink">Actividades</h1>
            <p className="text-sm text-ink/40">
              {activities.length === 0
                ? 'Sin actividades'
                : `${activities.length} sesiones${activitiesMeta.hasMore ? '+' : ''}`}
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
          {FILTERS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setFilter(id)} aria-label={label}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-2xl transition-all duration-150 ${
                id === 'all' ? 'px-3 py-2' : 'h-9 w-9 justify-center'
              } ${filter === id ? 'bg-ink text-white' : 'bg-white shadow-card text-ink/50'}`}
            >
              <Icon size={15} />
              {id === 'all' && <span className="text-xs font-semibold">{label}</span>}
            </button>
          ))}
        </div>

        {/* List */}
        {!activitiesMeta.loaded && loadingMore ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="text-ink/30 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
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
            {filtered.map((act) => (
              <ActivityCard
                key={act.id}
                act={act}
                onEdit={(a) => { setEditActivity(a); setShowAdd(true); }}
                onDelete={(id) => RecoveryService.deleteActivity(id)}
              />
            ))}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />

        {/* Load-more spinner */}
        {loadingMore && activitiesMeta.loaded && (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="text-ink/30 animate-spin" />
          </div>
        )}

        {/* End of list */}
        {activitiesMeta.loaded && !activitiesMeta.hasMore && activities.length > 0 && (
          <p className="text-center text-xs text-ink/25 pb-2">— Todas las actividades cargadas —</p>
        )}
      </div>

      <AddActivitySheet
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setEditActivity(undefined); }}
        editActivity={editActivity}
      />
    </>
  );
}
