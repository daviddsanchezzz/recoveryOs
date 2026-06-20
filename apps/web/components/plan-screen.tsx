'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dumbbell, Bike, Footprints, Waves, HeartPulse, RefreshCw, SportShoe,
  Target, Layers, Sun, Clock, Plus, X, ChevronRight,
} from 'lucide-react';
import { weekDates, todayIso } from '../lib/date';
import { usePlanStore } from '../stores/plan-store';
import { PlanService } from '../lib/plan-service';
import { useSessionStore } from '../stores/session-store';
import { Portal } from './portal';
import type { ActivityType } from '../stores/recovery-store';
import type { PlanEntry } from '../stores/plan-store';

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const ACTIVITY_OPTIONS: { id: ActivityType; label: string; Icon: React.ElementType }[] = [
  { id: 'gym',      label: 'Gym',       Icon: Dumbbell   },
  { id: 'bike',     label: 'Bici',      Icon: Bike       },
  { id: 'run',      label: 'Correr',    Icon: SportShoe  },
  { id: 'walk',     label: 'Caminar',   Icon: Footprints },
  { id: 'swim',     label: 'Natación',  Icon: Waves      },
  { id: 'mobility', label: 'Movilidad', Icon: RefreshCw  },
  { id: 'rehab',    label: 'Rehab',     Icon: HeartPulse },
];

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = Object.fromEntries(
  ACTIVITY_OPTIONS.map(({ id, Icon }) => [id, Icon]),
) as Record<ActivityType, React.ElementType>;

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

const WEEK_OPTIONS = [4, 6, 8, 10, 12, 16];

// ── Helpers ────────────────────────────────────────────────────────────────

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function weekRangeLabel(days: string[]): string {
  const first = new Date(days[0] + 'T12:00:00');
  const last  = new Date(days[6] + 'T12:00:00');
  const sameMonth = first.getMonth() === last.getMonth();
  const month = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return sameMonth
    ? `${first.getDate()}–${last.getDate()} ${month(last)}`
    : `${first.getDate()} ${month(first)} – ${last.getDate()} ${month(last)}`;
}

function dayFullLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── Bottom sheet wrapper ───────────────────────────────────────────────────

function Sheet({ isOpen, onClose, title, subtitle, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] p-6 space-y-5 shadow-card-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-ink/10 mx-auto" />
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink/40 mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </Portal>
  );
}

// ── Add plan entry sheet ───────────────────────────────────────────────────

function AddPlanEntrySheet({ isOpen, dateStr, onClose }: {
  isOpen: boolean;
  dateStr: string;
  onClose: () => void;
}) {
  const addPlanEntry = usePlanStore((s) => s.addPlanEntry);
  const [type,  setType]  = useState<ActivityType>('gym');
  const [label, setLabel] = useState('Gym');
  const [time,  setTime]  = useState('');
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setType('gym');
    setLabel('Gym');
    setTime('');
  }, [isOpen]);

  function handleTypeSelect(id: ActivityType, defaultLabel: string) {
    setType(id);
    setLabel(defaultLabel);
    labelRef.current?.focus();
  }

  function handleAdd() {
    if (!label.trim()) return;
    addPlanEntry(dateStr, { type, label: label.trim(), time: time || undefined });
    onClose();
  }

  const subtitle = cap(dayFullLabel(dateStr));

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Añadir actividad" subtitle={subtitle}>
      {/* Type selector */}
      <div>
        <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">Tipo</p>
        <div className="grid grid-cols-4 gap-2">
          {ACTIVITY_OPTIONS.map(({ id, label: lbl, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTypeSelect(id, lbl)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
                type === id ? 'bg-ink' : 'bg-canvas'
              }`}
            >
              <Icon size={16} className={type === id ? 'text-white' : 'text-ink/50'} />
              <span className={`text-[9px] font-semibold leading-none ${
                type === id ? 'text-white/80' : 'text-ink/40'
              }`}>
                {lbl}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div>
        <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">Descripción</p>
        <input
          ref={labelRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Gym pecho, Bici 45 min…"
          className="w-full bg-canvas rounded-2xl px-4 py-3 text-sm text-ink placeholder-ink/30 outline-none"
        />
      </div>

      {/* Time */}
      <div>
        <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">
          Hora <span className="normal-case font-normal tracking-normal">(opcional)</span>
        </p>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-canvas rounded-2xl px-4 py-3 text-sm text-ink outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!label.trim()}
        className="w-full bg-ink text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-30 transition-opacity"
      >
        Añadir
      </button>
    </Sheet>
  );
}

// ── Add goal sheet ─────────────────────────────────────────────────────────

function AddGoalSheet({ isOpen, onClose, userId }: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) {
  const [label,    setLabel]    = useState('');
  const [progress, setProgress] = useState(0);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!isOpen) { setLabel(''); setProgress(0); }
  }, [isOpen]);

  async function handleAdd() {
    if (!label.trim()) return;
    setLoading(true);
    await PlanService.createGoal(userId, label.trim(), progress);
    setLoading(false);
    onClose();
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Nuevo objetivo">
      <div>
        <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">Objetivo</p>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Recuperar tobillo, Correr 10 km…"
          autoFocus
          className="w-full bg-canvas rounded-2xl px-4 py-3 text-sm text-ink placeholder-ink/30 outline-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-widest">Progreso inicial</p>
          <span className="text-sm font-bold text-ink">{progress}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-moss h-1.5"
        />
        <div className="h-1.5 rounded-full bg-canvas overflow-hidden mt-1">
          <div
            className="h-full rounded-full bg-moss transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!label.trim() || loading}
        className="w-full bg-ink text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-30 transition-opacity"
      >
        {loading ? 'Guardando…' : 'Añadir objetivo'}
      </button>
    </Sheet>
  );
}

// ── Add program sheet ──────────────────────────────────────────────────────

function AddProgramSheet({ isOpen, onClose, userId }: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) {
  const [name,       setName]       = useState('');
  const [totalWeeks, setTotalWeeks] = useState(8);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!isOpen) { setName(''); setTotalWeeks(8); }
  }, [isOpen]);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    await PlanService.createProgram(userId, name.trim(), totalWeeks);
    setLoading(false);
    onClose();
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Nuevo programa">
      <div>
        <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">Nombre</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Recuperación tibial posterior…"
          autoFocus
          className="w-full bg-canvas rounded-2xl px-4 py-3 text-sm text-ink placeholder-ink/30 outline-none"
        />
      </div>

      <div>
        <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">Duración</p>
        <div className="grid grid-cols-3 gap-2">
          {WEEK_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setTotalWeeks(w)}
              className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
                totalWeeks === w ? 'bg-ink text-white' : 'bg-canvas text-ink/60'
              }`}
            >
              {w} semanas
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={!name.trim() || loading}
        className="w-full bg-ink text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-30 transition-opacity"
      >
        {loading ? 'Creando…' : 'Crear programa'}
      </button>
    </Sheet>
  );
}

// ── Day cell ───────────────────────────────────────────────────────────────

function DayCell({
  dateStr, letter, isSelected, isToday, entries, onClick,
}: {
  dateStr: string;
  letter: string;
  isSelected: boolean;
  isToday: boolean;
  entries: PlanEntry[];
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
        {entries.length === 0 ? (
          <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-ink/10'}`} />
        ) : (
          entries.slice(0, 3).map((e, j) => (
            <div
              key={j}
              className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : DOT_COLOR[e.type]}`}
            />
          ))
        )}
      </div>
    </button>
  );
}

// ── Day detail ─────────────────────────────────────────────────────────────

function DayDetail({ dateStr, entries, onAdd, onRemove }: {
  dateStr: string;
  entries: PlanEntry[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const label = cap(dayFullLabel(dateStr));

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="h-px bg-ink/5" />

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-ink/40 px-1">{label}</p>
        <button
          type="button"
          onClick={onAdd}
          className="h-7 w-7 rounded-xl bg-canvas flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {entries.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-3 px-1 pb-1 w-full text-left group"
        >
          <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
            <Sun size={15} className="text-ink/20" />
          </div>
          <span className="text-sm text-ink/30 group-hover:text-ink/50 transition-colors">
            Día libre — pulsa para añadir
          </span>
        </button>
      ) : (
        <div className="space-y-1.5 pb-1">
          {entries.map((entry, i) => {
            const Icon = ACTIVITY_ICONS[entry.type] ?? Target;
            return (
              <div key={i} className="flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-moss" />
                </div>
                <span className="text-sm text-ink flex-1 leading-snug">{entry.label}</span>
                {entry.time && (
                  <span className="text-xs text-ink/35 tabular-nums flex items-center gap-1 flex-shrink-0">
                    <Clock size={10} className="text-ink/25" />
                    {entry.time}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-ink/20 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Goal row ───────────────────────────────────────────────────────────────

function GoalRow({ id, label, progressPct, onDelete }: {
  id: string;
  label: string;
  progressPct: number;
  onDelete: () => void;
}) {
  const barColor = progressPct >= 70 ? 'bg-moss' : progressPct >= 40 ? 'bg-ink' : 'bg-sand';

  return (
    <div className="space-y-2.5 group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-xl bg-moss-light flex items-center justify-center flex-shrink-0">
            <Target size={13} className="text-moss" />
          </div>
          <p className="text-sm text-ink leading-snug truncate">{label}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-ink/40 tabular-nums">{progressPct}%</span>
          <button
            type="button"
            onClick={onDelete}
            className="h-6 w-6 rounded-lg flex items-center justify-center text-ink/20 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X size={12} />
          </button>
        </div>
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

// ── Program card ───────────────────────────────────────────────────────────

function ProgramCard({ name, currentWeek, totalWeeks }: {
  name: string;
  currentWeek: number;
  totalWeeks: number;
}) {
  const pct = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <div className="rounded-3xl bg-white shadow-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-moss-light flex items-center justify-center flex-shrink-0">
          <Layers size={16} className="text-moss" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug truncate">{name}</p>
          <p className="text-xs text-ink/40 mt-0.5">Semana {currentWeek} de {totalWeeks}</p>
        </div>
        <ChevronRight size={16} className="text-ink/20 flex-shrink-0" />
      </div>
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
        <div className="h-full rounded-full bg-moss transition-all duration-700" style={{ width: `${pct}%` }} />
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
  const [selectedIdx,     setSelectedIdx]     = useState(initialIdx);
  const [showAddEntry,    setShowAddEntry]    = useState(false);
  const [showAddGoal,     setShowAddGoal]     = useState(false);
  const [showAddProgram,  setShowAddProgram]  = useState(false);

  const user = useSessionStore((s) => s.user);
  const { goals, goalsLoaded, program, programLoaded, weekPlan, addPlanEntry, removePlanEntry } = usePlanStore();

  useEffect(() => {
    if (!user) return;
    void PlanService.loadGoals(user.id);
    void PlanService.loadProgram(user.id);
  }, [user?.id]);

  const selectedDate   = days[selectedIdx];
  const dayEntries     = weekPlan[selectedDate] ?? [];
  const showGoalEmpty  = goalsLoaded && goals.length === 0;
  const showProgEmpty  = programLoaded && !program;

  return (
    <>
      <div className="px-4 pt-4 pb-24 space-y-5 animate-fade-in">

        {/* Header */}
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-ink">Plan</h1>
          <p className="text-sm text-ink/40">{weekRangeLabel(days)}</p>
        </div>

        {/* ── 1. Esta semana ─────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Esta semana
          </p>
          <div className="rounded-4xl bg-white shadow-card p-4 space-y-3">
            <div className="grid grid-cols-7 gap-1">
              {days.map((dateStr, i) => (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  letter={DAY_LETTERS[i]}
                  isSelected={i === selectedIdx}
                  isToday={dateStr === today}
                  entries={weekPlan[dateStr] ?? []}
                  onClick={() => setSelectedIdx(i)}
                />
              ))}
            </div>
            <DayDetail
              dateStr={selectedDate}
              entries={dayEntries}
              onAdd={() => setShowAddEntry(true)}
              onRemove={(index) => removePlanEntry(selectedDate, index)}
            />
          </div>
        </div>

        {/* ── 2. Objetivos activos ──────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">
              Objetivos activos
            </p>
            <button
              type="button"
              onClick={() => setShowAddGoal(true)}
              className="h-6 w-6 rounded-lg bg-canvas flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>

          {goals.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowAddGoal(true)}
              className="w-full rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center hover:bg-canvas transition-colors"
            >
              <Target size={22} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin objetivos activos</p>
              <p className="text-xs text-ink/30 font-medium">Pulsa para añadir tu primer objetivo</p>
            </button>
          ) : (
            <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
              {goals.map((g, i) => (
                <div key={g.id}>
                  <GoalRow
                    id={g.id}
                    label={g.label}
                    progressPct={g.progressPct}
                    onDelete={() => user && PlanService.deleteGoal(g.id)}
                  />
                  {i < goals.length - 1 && <div className="h-px bg-ink/5 mt-4" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Programa activo ───────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Programa activo
          </p>

          {!programLoaded || program ? (
            program ? (
              <ProgramCard
                name={program.name}
                currentWeek={program.currentWeek}
                totalWeeks={program.totalWeeks}
              />
            ) : (
              <div className="rounded-4xl bg-white shadow-card p-4 animate-pulse">
                <div className="h-4 bg-canvas rounded-full w-1/2" />
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowAddProgram(true)}
              className="w-full rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center hover:bg-canvas transition-colors"
            >
              <Layers size={22} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin programa activo</p>
              <p className="text-xs text-ink/30 font-medium">Pulsa para crear tu programa de recuperación</p>
            </button>
          )}
        </div>

        {/* ── 4. Semana base ───────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Semana base
          </p>
          <div className="rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-ink/40">Plantilla semanal</p>
            <p className="text-xs text-ink/25">Próximamente podrás definir tu semana tipo</p>
          </div>
        </div>

      </div>

      {/* ── Sheets ──────────────────────────────────────── */}
      <AddPlanEntrySheet
        isOpen={showAddEntry}
        dateStr={selectedDate}
        onClose={() => setShowAddEntry(false)}
      />

      {user && (
        <>
          <AddGoalSheet
            isOpen={showAddGoal}
            onClose={() => setShowAddGoal(false)}
            userId={user.id}
          />
          <AddProgramSheet
            isOpen={showAddProgram}
            onClose={() => setShowAddProgram(false)}
            userId={user.id}
          />
        </>
      )}
    </>
  );
}
