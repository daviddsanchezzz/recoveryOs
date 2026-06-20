'use client';

import { useEffect, useState } from 'react';
import {
  Dumbbell, Bike, Footprints, Waves, HeartPulse, RefreshCw,
  SportShoe, Target, Layers, Sun, ChevronRight, Clock,
} from 'lucide-react';
import { weekDates, todayIso } from '../lib/date';
import { usePlanStore } from '../stores/plan-store';
import { usePlanStore as _usePlanStore } from '../stores/plan-store';
import { PlanService } from '../lib/plan-service';
import { useSessionStore } from '../stores/session-store';
import type { ActivityType } from '../stores/recovery-store';

// ── Types ──────────────────────────────────────────────────────────────────

type PlannedActivity = {
  type: ActivityType;
  label: string;
  time?: string;
};

// ── Mock data ──────────────────────────────────────────────────────────────

// MOCK – sustituir por planificación real del usuario
const MOCK_WEEK_PLAN: Record<number, PlannedActivity[]> = {
  0: [
    { type: 'gym',      label: 'Gym pecho',         time: '17:00' },
    { type: 'bike',     label: 'Bici suave 30 min',  time: '20:00' },
    { type: 'rehab',    label: 'Rehab tobillo',       time: '21:00' },
  ],
  1: [
    { type: 'gym',   label: 'Gym espalda',    time: '17:30' },
    { type: 'walk',  label: 'Caminar 45 min', time: '19:00' },
  ],
  2: [
    { type: 'bike',  label: 'Bici 45 min',    time: '07:00' },
    { type: 'rehab', label: 'Rehab tobillo',   time: '21:00' },
  ],
  3: [
    { type: 'gym', label: 'Gym hombro', time: '18:00' },
  ],
  4: [
    { type: 'bike',     label: 'Bici 1 h',    time: '07:30' },
    { type: 'mobility', label: 'Movilidad',    time: '21:00' },
  ],
  5: [],
  6: [
    { type: 'mobility', label: 'Movilidad 30 min', time: '10:00' },
  ],
};

// MOCK goals (shown when no real goals loaded from server)
const MOCK_GOALS = [
  { id: 'mock-1', label: 'Recuperar tobillo',       progressPct: 72, sortOrder: 0 },
  { id: 'mock-2', label: 'Mantener peso 74–76 kg',  progressPct: 65, sortOrder: 1 },
  { id: 'mock-3', label: 'Volver a correr 10 km',   progressPct: 40, sortOrder: 2 },
];

// MOCK active program
const MOCK_PROGRAM = {
  id: 'mock-prog',
  name: 'Recuperación tibial posterior',
  totalWeeks: 12,
  currentWeek: 5,
};

// MOCK weekly template
const MOCK_TEMPLATE = [
  { day: 'Lunes',    activities: ['Gym pecho'] },
  { day: 'Martes',   activities: ['Gym espalda'] },
  { day: 'Miércoles', activities: ['Bici'] },
  { day: 'Jueves',   activities: ['Gym hombro'] },
  { day: 'Viernes',  activities: ['Bici'] },
  { day: 'Sábado',   activities: ['Libre'] },
  { day: 'Domingo',  activities: ['Movilidad'] },
];

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  gym:      Dumbbell,
  bike:     Bike,
  run:      SportShoe,
  walk:     Footprints,
  swim:     Waves,
  mobility: RefreshCw,
  rehab:    HeartPulse,
  other:    Target,
};

// dot color per activity type (Tailwind bg- classes)
const DOT_COLOR: Record<ActivityType, string> = {
  gym:      'bg-moss',
  bike:     'bg-ember',
  run:      'bg-moss',
  walk:     'bg-sand',
  swim:     'bg-ink/40',
  mobility: 'bg-moss/60',
  rehab:    'bg-ember/70',
  other:    'bg-ink/20',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function weekRangeLabel(days: string[]): string {
  const first = new Date(days[0] + 'T12:00:00');
  const last  = new Date(days[6] + 'T12:00:00');
  const sameMonth = first.getMonth() === last.getMonth();
  const month = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  if (sameMonth) {
    return `${first.getDate()}–${last.getDate()} ${month(last)}`;
  }
  return `${first.getDate()} ${month(first)} – ${last.getDate()} ${month(last)}`;
}

function dayFullLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Sub-components ─────────────────────────────────────────────────────────

function DayCell({
  dateStr, letter, isSelected, isToday, activities, onClick,
}: {
  dateStr: string;
  letter: string;
  isSelected: boolean;
  isToday: boolean;
  activities: PlannedActivity[];
  onClick: () => void;
}) {
  const dayNum = parseInt(dateStr.split('-')[2], 10);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-150 ${
        isSelected ? 'bg-ink' : 'hover:bg-canvas'
      }`}
    >
      <span className={`text-[9px] font-semibold uppercase tracking-wider ${
        isSelected ? 'text-white/50' : 'text-ink/30'
      }`}>
        {letter}
      </span>
      <span className={`text-sm font-bold leading-none ${
        isSelected ? 'text-white' : isToday ? 'text-moss' : 'text-ink'
      }`}>
        {dayNum}
      </span>
      <div className="flex gap-0.5 items-center h-2">
        {activities.length === 0 ? (
          <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-ink/10'}`} />
        ) : (
          activities.slice(0, 3).map((act, j) => (
            <div
              key={j}
              className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : DOT_COLOR[act.type]}`}
            />
          ))
        )}
      </div>
    </button>
  );
}

function DayDetail({ dateStr, activities }: { dateStr: string; activities: PlannedActivity[] }) {
  const label = cap(dayFullLabel(dateStr));

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="h-px bg-ink/5" />
      <p className="text-[11px] font-semibold text-ink/40 px-1">{label}</p>

      {activities.length === 0 ? (
        <div className="flex items-center gap-3 px-1 pb-1">
          <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
            <Sun size={15} className="text-ink/20" />
          </div>
          <span className="text-sm text-ink/35">Día libre</span>
        </div>
      ) : (
        <div className="space-y-1.5 pb-1">
          {activities.map((act, i) => {
            const Icon = ACTIVITY_ICONS[act.type];
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-moss" />
                </div>
                <span className="text-sm text-ink flex-1 leading-snug">{act.label}</span>
                {act.time && (
                  <span className="text-xs text-ink/35 tabular-nums flex-shrink-0 flex items-center gap-1">
                    <Clock size={10} className="text-ink/25" />
                    {act.time}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GoalRow({ label, progressPct }: { label: string; progressPct: number }) {
  const barColor = progressPct >= 70 ? 'bg-moss' : progressPct >= 40 ? 'bg-ink' : 'bg-sand';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl bg-moss-light flex items-center justify-center flex-shrink-0">
            <Target size={13} className="text-moss" />
          </div>
          <p className="text-sm text-ink leading-snug">{label}</p>
        </div>
        <span className="text-xs font-bold text-ink/40 tabular-nums flex-shrink-0">{progressPct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}

function ProgramCard({ name, currentWeek, totalWeeks }: { name: string; currentWeek: number; totalWeeks: number }) {
  const pct = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <div className="rounded-3xl bg-white shadow-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-moss-light flex items-center justify-center flex-shrink-0">
          <Layers size={16} className="text-moss" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug truncate">{name}</p>
          <p className="text-xs text-ink/40 mt-0.5">
            Semana {currentWeek} de {totalWeeks}
          </p>
        </div>
        <ChevronRight size={16} className="text-ink/20 flex-shrink-0" />
      </div>
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
        <div
          className="h-full rounded-full bg-moss transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-ink/30 text-right tabular-nums">{pct}% completado</p>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export function PlanScreen() {
  const days  = weekDates();
  const today = todayIso();
  const initialIdx = Math.max(0, days.indexOf(today));
  const [selectedIdx, setSelectedIdx] = useState(initialIdx);

  const user         = useSessionStore((s) => s.user);
  const { goals, goalsLoaded, program, programLoaded } = usePlanStore();

  // Load real data from server on mount
  useEffect(() => {
    if (!user) return;
    void PlanService.loadGoals(user.id);
    void PlanService.loadProgram(user.id);
  }, [user?.id]);

  // Use real data if loaded, otherwise fall back to mock
  const displayGoals   = goalsLoaded && goals.length > 0 ? goals : MOCK_GOALS;
  const displayProgram = programLoaded ? program : MOCK_PROGRAM;

  return (
    <div className="px-4 pt-4 pb-24 space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold text-ink">Plan</h1>
        <p className="text-sm text-ink/40">{weekRangeLabel(days)}</p>
      </div>

      {/* ── 1. Semana actual ────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
          Esta semana
        </p>
        <div className="rounded-4xl bg-white shadow-card p-4 space-y-3">
          {/* Week strip */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((dateStr, i) => (
              <DayCell
                key={dateStr}
                dateStr={dateStr}
                letter={DAY_LETTERS[i]}
                isSelected={i === selectedIdx}
                isToday={dateStr === today}
                activities={MOCK_WEEK_PLAN[i] ?? []}
                onClick={() => setSelectedIdx(i)}
              />
            ))}
          </div>

          {/* Day detail */}
          <DayDetail
            dateStr={days[selectedIdx]}
            activities={MOCK_WEEK_PLAN[selectedIdx] ?? []}
          />
        </div>
      </div>

      {/* ── 2. Objetivos activos ─────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
          Objetivos activos
        </p>
        {displayGoals.length === 0 ? (
          <div className="rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center">
            <Target size={22} className="text-ink/20" />
            <p className="text-sm text-ink/40">Sin objetivos activos</p>
            <p className="text-xs text-ink/25">Añade tu primer objetivo de recuperación</p>
          </div>
        ) : (
          <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
            {displayGoals.map((g, i) => (
              <div key={g.id}>
                <GoalRow label={g.label} progressPct={g.progressPct} />
                {i < displayGoals.length - 1 && <div className="h-px bg-ink/5 mt-4" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Programa activo ───────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
          Programa activo
        </p>
        {displayProgram ? (
          <ProgramCard
            name={displayProgram.name}
            currentWeek={displayProgram.currentWeek}
            totalWeeks={displayProgram.totalWeeks}
          />
        ) : (
          <div className="rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center">
            <Layers size={22} className="text-ink/20" />
            <p className="text-sm text-ink/40">Sin programa activo</p>
            <p className="text-xs text-ink/25">Próximamente podrás crear o importar un programa</p>
          </div>
        )}
      </div>

      {/* ── 4. Plantilla semanal ────────────────────────── */}
      {/* MOCK – sustituir por plantilla configurable del usuario */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
          Semana base
        </p>
        <div className="rounded-4xl bg-white shadow-card overflow-hidden">
          {MOCK_TEMPLATE.map((row, i) => (
            <div
              key={row.day}
              className={`flex items-center gap-3 px-5 py-3.5 ${
                i < MOCK_TEMPLATE.length - 1 ? 'border-b border-ink/5' : ''
              }`}
            >
              <span className="text-[11px] font-bold text-ink/30 w-6 flex-shrink-0 uppercase tracking-wide">
                {row.day.charAt(0)}
              </span>
              <span className="text-xs text-ink/25 w-px select-none">·</span>
              <span className="text-sm text-ink">{row.activities.join(', ')}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
