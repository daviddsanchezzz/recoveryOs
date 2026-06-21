'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SportShoe, Bike, Dumbbell, Footprints, Waves, RefreshCw, LayoutGrid, Activity,
  Plus, Clock, Flame, Heart, Mountain, Gauge, Bolt, Loader2,
  MoreHorizontal, Pencil, Trash2, X, Trophy, Search, SlidersHorizontal,
} from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import { RecoveryService } from '../lib/services';
import { AddActivitySheet } from './add-activity-sheet';
import { StravaConnectCard } from './strava-connect-card';
import { Portal } from './portal';
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
  { id: 'run',  label: 'Correr',   Icon: SportShoe  },
  { id: 'bike', label: 'Bici',     Icon: Bike       },
  { id: 'walk', label: 'Caminar',  Icon: Footprints },
  { id: 'swim', label: 'Natación', Icon: Waves      },
];

type DateRange = 'all' | 'week' | 'month' | '3months' | 'year';
type Source    = 'all' | 'strava' | 'manual';

const DATE_RANGE_OPTS: { id: DateRange; label: string }[] = [
  { id: 'all',     label: 'Todo' },
  { id: 'week',    label: 'Esta semana' },
  { id: 'month',   label: 'Este mes' },
  { id: '3months', label: 'Últimos 3 meses' },
  { id: 'year',    label: 'Este año' },
];

type AdvancedFilters = {
  dateRange:      DateRange;
  specificDate:   string;        // YYYY-MM-DD — overrides dateRange when set
  minDistanceKm:  string;
  maxDistanceKm:  string;
  minDurationMin: string;
  maxDurationMin: string;
  source:         Source;
  racesOnly:      boolean;
};

const DEFAULT_ADVANCED: AdvancedFilters = {
  dateRange:      'all',
  specificDate:   '',
  minDistanceKm:  '',
  maxDistanceKm:  '',
  minDurationMin: '',
  maxDurationMin: '',
  source:         'all',
  racesOnly:      false,
};

function countActiveFilters(f: AdvancedFilters): number {
  return [
    f.specificDate !== '' || f.dateRange !== 'all',
    f.minDistanceKm !== '',
    f.maxDistanceKm !== '',
    f.minDurationMin !== '',
    f.maxDurationMin !== '',
    f.source !== 'all',
    f.racesOnly,
  ].filter(Boolean).length;
}

function applyAllFilters(
  activities: ActivityEntry[],
  typeFilter: Filter,
  search: string,
  adv: AdvancedFilters,
): ActivityEntry[] {
  let r = [...activities].sort((a, b) => b.date.localeCompare(a.date));

  if (typeFilter !== 'all') r = r.filter((a) => a.type === typeFilter);

  if (search.trim()) {
    const q = search.toLowerCase();
    r = r.filter(
      (a) =>
        (a.stravaName ?? '').toLowerCase().includes(q) ||
        (a.notes ?? '').toLowerCase().includes(q) ||
        ACTIVITY_LABELS[a.type].toLowerCase().includes(q),
    );
  }

  if (adv.specificDate) {
    r = r.filter((a) => a.date === adv.specificDate);
  } else if (adv.dateRange !== 'all') {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    if      (adv.dateRange === 'week')    since.setDate(since.getDate() - 7);
    else if (adv.dateRange === 'month')   since.setMonth(since.getMonth() - 1);
    else if (adv.dateRange === '3months') since.setMonth(since.getMonth() - 3);
    else if (adv.dateRange === 'year')    since.setFullYear(since.getFullYear() - 1);
    const sinceStr = since.toISOString().split('T')[0];
    r = r.filter((a) => a.date >= sinceStr);
  }

  const minDist = parseFloat(adv.minDistanceKm);
  const maxDist = parseFloat(adv.maxDistanceKm);
  if (!isNaN(minDist)) r = r.filter((a) => (a.distanceKm ?? 0) >= minDist);
  if (!isNaN(maxDist)) r = r.filter((a) => (a.distanceKm ?? Infinity) <= maxDist);

  const minDur = parseInt(adv.minDurationMin);
  const maxDur = parseInt(adv.maxDurationMin);
  if (!isNaN(minDur)) r = r.filter((a) => (a.durationMinutes ?? 0) >= minDur);
  if (!isNaN(maxDur)) r = r.filter((a) => (a.durationMinutes ?? Infinity) <= maxDur);

  if (adv.source === 'strava')  r = r.filter((a) => !!a.stravaId);
  if (adv.source === 'manual')  r = r.filter((a) => !a.stravaId);
  if (adv.racesOnly)            r = r.filter((a) => !!a.isRace);

  return r;
}

// ─── Filter sheet ─────────────────────────────────────────────────────────────

function FilterSheet({
  isOpen,
  filters,
  onChange,
  onClose,
  onClear,
}: {
  isOpen: boolean;
  filters: AdvancedFilters;
  onChange: (f: AdvancedFilters) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<AdvancedFilters>(filters);
  useEffect(() => { if (isOpen) setDraft(filters); }, [isOpen]);

  const set = <K extends keyof AdvancedFilters>(k: K, v: AdvancedFilters[K]) =>
    setDraft((prev) => ({ ...prev, [k]: v }));

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-t-[2rem] max-h-[88vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/10" />
          </div>

          <div className="px-5 pb-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-lg font-bold text-ink">Filtros</p>
              <button type="button" onClick={onClose}
                className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30">
                <X size={14} />
              </button>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Período</p>
              <div className="flex flex-wrap gap-2">
                {DATE_RANGE_OPTS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { set('dateRange', opt.id); set('specificDate', ''); }}
                    className={`rounded-2xl px-3.5 py-2 text-xs font-semibold transition-all ${
                      draft.dateRange === opt.id && !draft.specificDate
                        ? 'bg-ink text-white'
                        : 'bg-canvas text-ink/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific date */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Día concreto</p>
              <div className="relative">
                <input
                  type="date"
                  value={draft.specificDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    set('specificDate', e.target.value);
                    if (e.target.value) set('dateRange', 'all');
                  }}
                  className="w-full rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:ring-1 focus:ring-ink/20 appearance-none"
                />
                {draft.specificDate && (
                  <button
                    type="button"
                    onClick={() => set('specificDate', '')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink/30">
                Al seleccionar un día concreto se ignora el período
              </p>
            </div>

            {/* Distance */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Distancia (km)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Mín"
                  value={draft.minDistanceKm}
                  onChange={(e) => set('minDistanceKm', e.target.value)}
                  className="flex-1 rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink/25 outline-none focus:ring-1 focus:ring-ink/20"
                />
                <span className="text-ink/30 text-sm">—</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Máx"
                  value={draft.maxDistanceKm}
                  onChange={(e) => set('maxDistanceKm', e.target.value)}
                  className="flex-1 rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink/25 outline-none focus:ring-1 focus:ring-ink/20"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Duración (min)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Mín"
                  value={draft.minDurationMin}
                  onChange={(e) => set('minDurationMin', e.target.value)}
                  className="flex-1 rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink/25 outline-none focus:ring-1 focus:ring-ink/20"
                />
                <span className="text-ink/30 text-sm">—</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Máx"
                  value={draft.maxDurationMin}
                  onChange={(e) => set('maxDurationMin', e.target.value)}
                  className="flex-1 rounded-2xl bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink/25 outline-none focus:ring-1 focus:ring-ink/20"
                />
              </div>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Origen</p>
              <div className="flex gap-2">
                {(['all', 'strava', 'manual'] as Source[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('source', s)}
                    className={`rounded-2xl px-4 py-2 text-xs font-semibold transition-all ${
                      draft.source === s
                        ? 'bg-ink text-white'
                        : 'bg-canvas text-ink/50'
                    }`}
                  >
                    {s === 'all' ? 'Todo' : s === 'strava' ? 'Strava' : 'Manual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Races only */}
            <button
              type="button"
              onClick={() => set('racesOnly', !draft.racesOnly)}
              className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 transition-colors ${
                draft.racesOnly ? 'bg-amber-50 border border-amber-200' : 'bg-canvas border border-ink/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Trophy size={15} className={draft.racesOnly ? 'text-amber-500' : 'text-ink/25'} />
                <span className={`text-sm font-semibold ${draft.racesOnly ? 'text-amber-700' : 'text-ink/50'}`}>
                  Solo carreras
                </span>
              </div>
              <div className={`h-5 w-9 rounded-full flex items-center px-0.5 transition-colors ${draft.racesOnly ? 'bg-amber-500' : 'bg-ink/15'}`}>
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${draft.racesOnly ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setDraft(DEFAULT_ADVANCED); onClear(); onClose(); }}
                className="flex-1 rounded-2xl border border-ink/10 py-3 text-sm font-semibold text-ink/50 hover:bg-canvas transition-colors"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => { onChange(draft); onClose(); }}
                className="flex-[2] rounded-2xl bg-ink py-3 text-sm font-semibold text-white transition-colors"
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function relativeDate(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
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

function fmtPace100m(secPer100m: number): string {
  const m = Math.floor(secPer100m / 60);
  const s = Math.round(secPer100m % 60);
  return `${m}:${String(s).padStart(2, '0')}/100m`;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// ─── Stat row (used in card) ─────────────────────────────────────────────────

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

// ─── Stat tile (used in detail sheet) ────────────────────────────────────────

function StatTile({ icon: Icon, label, value, color = 'text-moss' }: {
  icon: React.ElementType; label: string; value: string; color?: string;
}) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className={color} />
        <p className="text-[10px] font-semibold text-ink/30 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}

// ─── Activity card (simplified) ───────────────────────────────────────────────

export function ActivityCard({
  act,
  onEdit,
  onDelete,
  onTap,
}: {
  act: ActivityEntry;
  onEdit: (act: ActivityEntry) => void;
  onDelete: (id: string) => void;
  onTap?: (act: ActivityEntry) => void;
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
  const isGym = act.type === 'gym';

  return (
    <div
      className="rounded-3xl bg-white shadow-card px-4 py-3.5 flex items-start gap-3 cursor-pointer active:bg-canvas/60 transition-colors"
      onClick={() => onTap?.(act)}
    >
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
                {act.stravaName ?? relativeDate(act.date)}
              </span>
              {isGym && act.muscleGroups?.map((m) => (
                <span key={m} className="text-[9px] font-bold text-moss bg-moss/20 rounded-full px-2 py-0.5 leading-none tracking-wide">
                  {MUSCLE_LABELS[m] ?? m}
                </span>
              ))}
            </div>
          </div>

          {/* 3-dot menu */}
          <div
            ref={menuRef}
            className="relative flex-shrink-0 -mt-0.5 -mr-1.5"
            onClick={(e) => e.stopPropagation()}
          >
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

        {/* Simplified stats: only duration, kcal, avg HR */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {act.durationMinutes && (
            <Stat icon={Clock} value={fmtDuration(act.durationMinutes)} />
          )}
          {act.kcal && (
            <Stat icon={Flame} value={act.kcal} unit="kcal" color="text-orange-400" />
          )}
          {act.avgHeartRateBpm && (
            <Stat icon={Heart} value={act.avgHeartRateBpm} unit="bpm" color="text-red-400" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Activity detail sheet ────────────────────────────────────────────────────

export function ActivityDetailSheet({
  act,
  onClose,
  onEdit,
  onDelete,
}: {
  act: ActivityEntry | null;
  onClose: () => void;
  onEdit: (act: ActivityEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [isRace,    setIsRace]    = useState(act?.isRace ?? false);
  const [raceBusy,  setRaceBusy]  = useState(false);

  useEffect(() => { setIsRace(act?.isRace ?? false); }, [act?.id, act?.isRace]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  if (!act) return null;

  const Icon = ACTIVITY_ICONS[act.type] ?? Activity;
  const isRun  = act.type === 'run' || act.type === 'walk';
  const isBike = act.type === 'bike';
  const isSwim = act.type === 'swim';
  const isGym  = act.type === 'gym';

  return (
    <Portal>
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-[2rem] max-h-[88vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-ink/10" />
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-canvas flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-moss" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-ink">{ACTIVITY_LABELS[act.type]}</p>
                  {act.stravaId && (
                    <span className="text-[9px] font-bold text-orange-400 bg-orange-50 rounded-full px-1.5 py-0.5">
                      STRAVA
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink/40 mt-0.5">{relativeDate(act.date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* 3-dot menu */}
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30 hover:text-ink/60 transition-colors"
                >
                  <MoreHorizontal size={15} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-9 z-20 bg-white rounded-2xl shadow-card-lg border border-ink/5 overflow-hidden min-w-[130px]">
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onClose(); onEdit(act); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-ink hover:bg-canvas transition-colors"
                    >
                      <Pencil size={13} className="text-ink/40" />
                      Editar
                    </button>
                    <div className="h-px bg-ink/5 mx-3" />
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onClose(); onDelete(act.id); }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30 hover:text-ink/60 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Strava name */}
          {act.stravaName && (
            <p className="text-sm text-ink/50 -mt-2 pl-1">{act.stravaName}</p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {act.durationMinutes && (
              <StatTile icon={Clock} label="Duración" value={fmtDuration(act.durationMinutes)} />
            )}
            {act.kcal && (
              <StatTile icon={Flame} label="Calorías" value={`${act.kcal} kcal`} color="text-orange-400" />
            )}
            {act.avgHeartRateBpm && (
              <StatTile icon={Heart} label="FC media" value={`${act.avgHeartRateBpm} bpm`} color="text-red-400" />
            )}
            {act.maxHeartRateBpm && (
              <StatTile icon={Heart} label="FC máxima" value={`${act.maxHeartRateBpm} bpm`} color="text-red-500" />
            )}
            {(isRun || isBike) && act.distanceKm && (
              <StatTile icon={Gauge} label="Distancia" value={`${act.distanceKm.toFixed(2)} km`} />
            )}
            {isRun && act.avgPaceSecPerKm && (
              <StatTile icon={Activity} label="Ritmo" value={fmtPace(act.avgPaceSecPerKm)} />
            )}
            {(isRun || isBike) && act.elevationGainM && (
              <StatTile icon={Mountain} label="Desnivel" value={`${act.elevationGainM} m`} />
            )}
            {isRun && act.avgCadenceSpm && (
              <StatTile icon={Activity} label="Cadencia" value={`${act.avgCadenceSpm} spm`} />
            )}
            {isBike && act.avgSpeedKmh && (
              <StatTile icon={Activity} label="Velocidad" value={`${act.avgSpeedKmh.toFixed(1)} km/h`} />
            )}
            {isBike && act.avgPowerW && (
              <StatTile icon={Bolt} label="Potencia" value={`${act.avgPowerW} W`} />
            )}
            {isBike && act.avgCadenceRpm && (
              <StatTile icon={Activity} label="Cadencia" value={`${act.avgCadenceRpm} rpm`} />
            )}
            {isBike && act.kilojoules && (
              <StatTile icon={Bolt} label="Energía" value={`${act.kilojoules} kJ`} />
            )}
            {isSwim && act.distanceM && (
              <StatTile icon={Gauge} label="Distancia" value={`${act.distanceM} m`} />
            )}
            {isSwim && act.avgPacePer100mSec && (
              <StatTile icon={Activity} label="Ritmo" value={fmtPace100m(act.avgPacePer100mSec)} />
            )}
            {isGym && act.totalVolumeKg && (
              <StatTile icon={Dumbbell} label="Volumen" value={`${act.totalVolumeKg.toLocaleString('es-ES')} kg`} />
            )}
          </div>

          {/* Muscle groups */}
          {isGym && act.muscleGroups && act.muscleGroups.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-ink/30 uppercase tracking-widest mb-2">
                Grupos musculares
              </p>
              <div className="flex flex-wrap gap-2">
                {act.muscleGroups.map((m) => (
                  <span key={m} className="rounded-full bg-moss/10 px-3 py-1.5 text-xs font-semibold text-moss">
                    {MUSCLE_LABELS[m] ?? m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {act.notes && (
            <div>
              <p className="text-[10px] font-semibold text-ink/30 uppercase tracking-widest mb-1.5">
                Notas
              </p>
              <p className="text-sm text-ink/60 leading-relaxed">{act.notes}</p>
            </div>
          )}

          {/* Race toggle — only for running activities */}
          {act.type === 'run' && (
            <button
              type="button"
              disabled={raceBusy}
              onClick={async () => {
                setRaceBusy(true);
                const next = !isRace;
                setIsRace(next);
                await RecoveryService.setIsRace(act.id, next);
                setRaceBusy(false);
              }}
              className={`w-full flex items-center justify-between rounded-2xl px-4 py-3.5 transition-colors ${
                isRace
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-canvas border border-ink/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Trophy size={16} className={isRace ? 'text-amber-500' : 'text-ink/25'} />
                <span className={`text-sm font-semibold ${isRace ? 'text-amber-700' : 'text-ink/50'}`}>
                  Marcar como carrera
                </span>
              </div>
              <div className={`h-5 w-9 rounded-full transition-colors flex items-center px-0.5 ${isRace ? 'bg-amber-500' : 'bg-ink/15'}`}>
                <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${isRace ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>
          )}

        </div>
      </div>
    </div>
    </Portal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ActividadesScreen() {
  const [filter,          setFilter]          = useState<Filter>('all');
  const [search,          setSearch]          = useState('');
  const [showAdd,         setShowAdd]         = useState(false);
  const [showFilters,     setShowFilters]     = useState(false);
  const [advFilters,      setAdvFilters]      = useState<AdvancedFilters>(DEFAULT_ADVANCED);
  const [editActivity,    setEditActivity]    = useState<ActivityEntry | undefined>(undefined);
  const [detailActivity,  setDetailActivity]  = useState<ActivityEntry | null>(null);
  const [loadingMore,     setLoadingMore]     = useState(false);

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

  // Infinite scroll
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

  const filtered = useMemo(
    () => applyAllFilters(activities, filter, search, advFilters),
    [activities, filter, search, advFilters],
  );

  const activeAdvCount = countActiveFilters(advFilters);

  // Group by date
  const groupedByDate = useMemo(
    () => filtered.reduce<Record<string, ActivityEntry[]>>((acc, act) => {
      if (!acc[act.date]) acc[act.date] = [];
      acc[act.date].push(act);
      return acc;
    }, {}),
    [filtered],
  );
  const sortedDates = useMemo(
    () => Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)),
    [groupedByDate],
  );

  return (
    <>
      <div className="px-4 pt-4 pb-24 space-y-3 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-ink">Actividades</h1>
            <p className="text-sm text-ink/40">
              {filtered.length !== activities.length
                ? `${filtered.length} de ${activities.length}${activitiesMeta.hasMore ? '+' : ''} sesiones`
                : `${activities.length}${activitiesMeta.hasMore ? '+' : ''} sesiones`}
            </p>
          </div>
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-ink px-3.5 py-2 flex-shrink-0 mt-1">
            <Plus size={13} className="text-white" />
            <span className="text-xs font-semibold text-white">Añadir</span>
          </button>
        </div>

        {/* Strava */}
        <StravaConnectCard hideIfSynced onSynced={() => setLoadingMore(false)} />

        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, tipo, notas…"
            className="w-full rounded-2xl bg-white shadow-card pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink/30 outline-none focus:ring-1 focus:ring-ink/15"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Type chips + filter button */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
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
          {/* Advanced filter button */}
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={`relative flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-2xl transition-all ${
              activeAdvCount > 0 ? 'bg-moss text-white' : 'bg-white shadow-card text-ink/50'
            }`}
          >
            <SlidersHorizontal size={15} />
            {activeAdvCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-ink text-white text-[9px] font-bold flex items-center justify-center">
                {activeAdvCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter summary chips */}
        {activeAdvCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {advFilters.specificDate ? (
              <span className="rounded-full bg-moss/10 text-moss text-[11px] font-semibold px-2.5 py-1">
                {new Date(advFilters.specificDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            ) : advFilters.dateRange !== 'all' && (
              <span className="rounded-full bg-moss/10 text-moss text-[11px] font-semibold px-2.5 py-1">
                {DATE_RANGE_OPTS.find((o) => o.id === advFilters.dateRange)?.label}
              </span>
            )}
            {advFilters.minDistanceKm && (
              <span className="rounded-full bg-moss/10 text-moss text-[11px] font-semibold px-2.5 py-1">
                ≥ {advFilters.minDistanceKm} km
              </span>
            )}
            {advFilters.maxDistanceKm && (
              <span className="rounded-full bg-moss/10 text-moss text-[11px] font-semibold px-2.5 py-1">
                ≤ {advFilters.maxDistanceKm} km
              </span>
            )}
            {advFilters.minDurationMin && (
              <span className="rounded-full bg-moss/10 text-moss text-[11px] font-semibold px-2.5 py-1">
                ≥ {advFilters.minDurationMin} min
              </span>
            )}
            {advFilters.maxDurationMin && (
              <span className="rounded-full bg-moss/10 text-moss text-[11px] font-semibold px-2.5 py-1">
                ≤ {advFilters.maxDurationMin} min
              </span>
            )}
            {advFilters.source !== 'all' && (
              <span className="rounded-full bg-moss/10 text-moss text-[11px] font-semibold px-2.5 py-1 capitalize">
                {advFilters.source}
              </span>
            )}
            {advFilters.racesOnly && (
              <span className="rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-1">
                Solo carreras
              </span>
            )}
            <button
              type="button"
              onClick={() => setAdvFilters(DEFAULT_ADVANCED)}
              className="rounded-full bg-ink/5 text-ink/40 text-[11px] font-semibold px-2.5 py-1"
            >
              × Limpiar
            </button>
          </div>
        )}

        {/* List */}
        {!activitiesMeta.loaded && loadingMore ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="text-ink/30 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-4xl bg-canvas-light border border-sand/40 p-8 flex flex-col items-center gap-2 text-center">
            <Activity size={24} className="text-ink/20" />
            <p className="text-sm text-ink/40">
              {search || activeAdvCount > 0
                ? 'Ninguna actividad coincide con los filtros'
                : filter === 'all'
                  ? 'Sin actividades registradas'
                  : `Sin actividades de tipo ${ACTIVITY_LABELS[filter as ActivityType]}`}
            </p>
            {(search || activeAdvCount > 0) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setAdvFilters(DEFAULT_ADVANCED); }}
                className="text-xs text-moss font-semibold mt-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-semibold text-ink/35 px-1 uppercase tracking-wide">
                  {relativeDate(date)}
                </p>
                <div className="space-y-2">
                  {groupedByDate[date].map((act) => (
                    <ActivityCard
                      key={act.id}
                      act={act}
                      onTap={setDetailActivity}
                      onEdit={(a) => { setEditActivity(a); setShowAdd(true); }}
                      onDelete={(id) => RecoveryService.deleteActivity(id)}
                    />
                  ))}
                </div>
              </div>
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

      <ActivityDetailSheet
        act={detailActivity}
        onClose={() => setDetailActivity(null)}
        onEdit={(a) => { setDetailActivity(null); setEditActivity(a); setShowAdd(true); }}
        onDelete={(id) => { setDetailActivity(null); RecoveryService.deleteActivity(id); }}
      />

      <FilterSheet
        isOpen={showFilters}
        filters={advFilters}
        onChange={setAdvFilters}
        onClose={() => setShowFilters(false)}
        onClear={() => setAdvFilters(DEFAULT_ADVANCED)}
      />
    </>
  );
}
