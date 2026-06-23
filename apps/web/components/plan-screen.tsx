'use client';

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  Bike,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  Layers,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  SportShoe,
  Sun,
  Target,
  Waves,
  X,
} from 'lucide-react';
import { todayIso, weekDates } from '../lib/date';
import { PlanService } from '../lib/plan-service';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import { usePlanStore } from '../stores/plan-store';
import { Portal } from './portal';
import type { ActivityType, MuscleGroup } from '../stores/recovery-store';
import type { PlanEntry, StructuredGoal, StructuredGoalType } from '../stores/plan-store';

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WEEK_OPTIONS = [4, 6, 8, 10, 12, 16];

const ACTIVITY_OPTIONS: { id: ActivityType; label: string; Icon: ElementType }[] = [
  { id: 'gym', label: 'Gym', Icon: Dumbbell },
  { id: 'bike', label: 'Bici', Icon: Bike },
  { id: 'run', label: 'Correr', Icon: SportShoe },
  { id: 'walk', label: 'Caminar', Icon: Footprints },
  { id: 'swim', label: 'Nadar', Icon: Waves },
  { id: 'mobility', label: 'Movilidad', Icon: RefreshCw },
];

const ACTIVITY_ICONS: Record<ActivityType, ElementType> = {
  gym: Dumbbell,
  bike: Bike,
  run: SportShoe,
  walk: Footprints,
  swim: Waves,
  mobility: RefreshCw,
  other: Target,
};

const DOT_COLOR: Record<ActivityType, string> = {
  gym: 'bg-moss',
  bike: 'bg-ember',
  run: 'bg-moss',
  walk: 'bg-sand',
  swim: 'bg-ink/40',
  mobility: 'bg-moss/60',
  other: 'bg-ink/20',
};

const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'pecho', label: 'Pecho' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'hombro', label: 'Hombro' },
  { id: 'core', label: 'Core' },
  { id: 'pierna', label: 'Pierna' },
  { id: 'gluteo', label: 'Glúteo' },
];

const STRUCTURED_GOAL_META: Record<
  StructuredGoalType,
  {
    label: string;
    unit: string;
    Icon: ElementType;
    cadence: 'daily' | 'weekly';
    color: string;
  }
> = {
  steps_daily: { label: 'Pasos diarios', unit: 'pasos', Icon: Footprints, cadence: 'daily', color: 'text-moss' },
  active_calories_daily: { label: 'Kcal activas diarias', unit: 'kcal', Icon: Flame, cadence: 'daily', color: 'text-ember' },
  sleep_hours_daily: { label: 'Sueño diario', unit: 'h', Icon: Moon, cadence: 'daily', color: 'text-sand' },
  activity_minutes_weekly: { label: 'Minutos semanales', unit: 'min', Icon: Clock, cadence: 'weekly', color: 'text-ink' },
  activity_sessions_weekly: { label: 'Sesiones semanales', unit: 'ses.', Icon: CalendarDays, cadence: 'weekly', color: 'text-moss' },
  training_sessions_daily: { label: 'Entrenos al día', unit: 'ses.', Icon: Dumbbell, cadence: 'daily', color: 'text-moss' },
};

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDaysForOffset(offset: number) {
  const base = new Date();
  base.setDate(base.getDate() + offset * 7);
  return weekDates(base);
}

function weekOffsetLabel(offset: number) {
  if (offset === 0) return 'Esta semana';
  if (offset === -1) return 'Semana pasada';
  if (offset === 1) return 'Próxima semana';
  return offset < 0 ? `Hace ${Math.abs(offset)} semanas` : `En ${offset} semanas`;
}

function weekRangeLabel(days: string[]) {
  const first = new Date(days[0] + 'T12:00:00');
  const last = new Date(days[6] + 'T12:00:00');
  const month = (date: Date) => date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

  return first.getMonth() === last.getMonth()
    ? `${first.getDate()}-${last.getDate()} ${month(last)}`
    : `${first.getDate()} ${month(first)} - ${last.getDate()} ${month(last)}`;
}

function dayFullLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatEntrySubtitle(entry: PlanEntry) {
  const parts: string[] = [];
  if (entry.time) parts.push(entry.time);
  if (entry.muscleGroups?.length) {
    parts.push(
      entry.muscleGroups
        .map((group) => MUSCLE_GROUPS.find((item) => item.id === group)?.label ?? group)
        .join(' · '),
    );
  }
  return parts.join(' · ');
}

function gymLabel(muscles: MuscleGroup[]) {
  if (muscles.length === 0) return 'Gym';
  return `Gym ${muscles.map((group) => MUSCLE_GROUPS.find((item) => item.id === group)?.label ?? group).join(', ')}`;
}

function Sheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-[2rem] bg-white shadow-card-lg animate-slide-up">
        <div className="sticky top-0 bg-white px-6 pb-2 pt-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/10" />
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-ink/40">{subtitle}</p> : null}
        </div>
        <div className="space-y-5 px-6 pb-8 pt-4">{children}</div>
      </div>
    </Portal>
  );
}

function ActivityPicker({
  onConfirm,
  initial,
  submitLabel = 'Añadir',
}: {
  onConfirm: (entry: PlanEntry) => void;
  initial?: PlanEntry;
  submitLabel?: string;
}) {
  const [type, setType] = useState<ActivityType>(initial?.type ?? 'gym');
  const [label, setLabel] = useState(initial?.label ?? 'Gym');
  const [time, setTime] = useState(initial?.time ?? '');
  const [muscles, setMuscles] = useState<MuscleGroup[]>(initial?.muscleGroups ?? []);
  const [labelEdited, setLabelEdited] = useState(Boolean(initial));

  function handleTypeSelect(nextType: ActivityType, defaultLabel: string) {
    setType(nextType);
    setLabel(defaultLabel);
    setTime('');
    setMuscles([]);
    setLabelEdited(false);
  }

  function toggleMuscle(group: MuscleGroup) {
    setMuscles((current) => {
      const next = current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group];
      if (!labelEdited) setLabel(gymLabel(next));
      return next;
    });
  }

  function handleConfirm() {
    if (!label.trim()) return;
    onConfirm({
      type,
      label: label.trim(),
      time: time || undefined,
      muscleGroups: type === 'gym' && muscles.length > 0 ? muscles : undefined,
    });
  }

  return (
    <div className="space-y-4 rounded-3xl bg-canvas p-4">
      <div className="grid grid-cols-4 gap-2">
        {ACTIVITY_OPTIONS.map(({ id, label: optionLabel, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTypeSelect(id, optionLabel)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-all ${type === id ? 'bg-ink' : 'bg-white shadow-card'}`}
          >
            <Icon size={15} className={type === id ? 'text-white' : 'text-ink/50'} />
            <span className={`text-[9px] font-semibold leading-none ${type === id ? 'text-white/80' : 'text-ink/40'}`}>
              {optionLabel}
            </span>
          </button>
        ))}
      </div>

      {type === 'gym' ? (
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink/40">Zona muscular</p>
          <div className="grid grid-cols-4 gap-1.5">
            {MUSCLE_GROUPS.map(({ id, label: optionLabel }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleMuscle(id)}
                className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${muscles.includes(id) ? 'bg-ink text-white' : 'bg-white text-ink/50 shadow-card'}`}
              >
                {optionLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <input
        type="text"
        value={label}
        onChange={(event) => {
          setLabel(event.target.value);
          setLabelEdited(true);
        }}
        placeholder="Descripción"
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-ink shadow-card outline-none placeholder:text-ink/30"
      />

      <div className="flex gap-2">
        <input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="w-[120px] flex-shrink-0 rounded-2xl bg-white px-4 py-3 text-sm text-ink shadow-card outline-none"
        />
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!label.trim()}
          className="flex-1 rounded-2xl bg-ink py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function AddPlanEntrySheet({
  isOpen,
  dateStr,
  onClose,
}: {
  isOpen: boolean;
  dateStr: string;
  onClose: () => void;
}) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Añadir actividad" subtitle={cap(dayFullLabel(dateStr))}>
      <ActivityPicker
        onConfirm={(entry) => {
          PlanService.addPlanEntry(dateStr, entry);
          onClose();
        }}
      />
    </Sheet>
  );
}

function GoalsSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { structuredGoals, updateStructuredGoal } = usePlanStore();

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Objetivos medibles"
      subtitle="Define pasos, kcal, sueño y volumen de actividad"
    >
      <div className="space-y-4">
        {structuredGoals.map((goal) => {
          const meta = STRUCTURED_GOAL_META[goal.type];
          const Icon = meta.Icon;

          return (
            <div key={goal.type} className="space-y-3 rounded-3xl bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-card">
                    <Icon size={16} className={meta.color} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{meta.label}</p>
                    <p className="text-xs text-ink/35">{meta.cadence === 'daily' ? 'Diario' : 'Semanal'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateStructuredGoal(goal.type, { enabled: !goal.enabled })}
                  className={`flex h-7 w-12 items-center rounded-full px-1 transition-all ${goal.enabled ? 'justify-end bg-ink' : 'justify-start bg-white shadow-card'}`}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  step={goal.type === 'sleep_hours_daily' ? '0.5' : '1'}
                  value={goal.target}
                  disabled={!goal.enabled}
                  onChange={(event) =>
                    updateStructuredGoal(goal.type, { target: Number(event.target.value || 0) })
                  }
                  className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink outline-none disabled:opacity-50"
                />
                <span className="w-16 text-right text-sm text-ink/40">{meta.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white"
      >
        Guardar
      </button>
    </Sheet>
  );
}

function AddProgramSheet({
  isOpen,
  onClose,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) {
  const [name, setName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(8);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setTotalWeeks(8);
    }
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
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink/40">Nombre</p>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Bloque de recuperación"
          className="w-full rounded-2xl bg-canvas px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/30"
        />
      </div>
      <div>
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink/40">Duración</p>
        <div className="grid grid-cols-3 gap-2">
          {WEEK_OPTIONS.map((weeks) => (
            <button
              key={weeks}
              type="button"
              onClick={() => setTotalWeeks(weeks)}
              className={`rounded-2xl py-3 text-sm font-semibold transition-all ${totalWeeks === weeks ? 'bg-ink text-white' : 'bg-canvas text-ink/60'}`}
            >
              {weeks} semanas
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={!name.trim() || loading}
        className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {loading ? 'Creando...' : 'Crear programa'}
      </button>
    </Sheet>
  );
}

function GoalRow({
  goal,
  currentValue,
  progressPct,
}: {
  goal: StructuredGoal;
  currentValue: number;
  progressPct: number;
}) {
  const meta = STRUCTURED_GOAL_META[goal.type];
  const Icon = meta.Icon;
  const targetLabel =
    goal.type === 'sleep_hours_daily'
      ? `${goal.target} ${meta.unit}`
      : `${Math.round(goal.target)} ${meta.unit}`;
  const currentLabel =
    goal.type === 'sleep_hours_daily'
      ? `${currentValue.toFixed(currentValue % 1 === 0 ? 0 : 1)} ${meta.unit}`
      : `${Math.round(currentValue)} ${meta.unit}`;
  const barColor = progressPct >= 100 ? 'bg-moss' : progressPct >= 60 ? 'bg-ink' : 'bg-sand';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-canvas">
            <Icon size={15} className={meta.color} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm leading-snug text-ink">{meta.label}</p>
            <p className="mt-0.5 text-xs text-ink/35">
              {currentLabel} / {targetLabel}
            </p>
          </div>
        </div>
        <span className="tabular-nums text-xs font-bold text-ink/40">{progressPct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(progressPct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ProgramCard({
  name,
  currentWeek,
  totalWeeks,
}: {
  name: string;
  currentWeek: number;
  totalWeeks: number;
}) {
  const pct = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <div className="space-y-3 rounded-3xl bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-moss-light">
          <Layers size={16} className="text-moss" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug text-ink">{name}</p>
          <p className="mt-0.5 text-xs text-ink/40">Semana {currentWeek} de {totalWeeks}</p>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-moss transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DayCell({
  dateStr,
  letter,
  isSelected,
  isToday,
  entries,
  onClick,
}: {
  dateStr: string;
  letter: string;
  isSelected: boolean;
  isToday: boolean;
  entries: PlanEntry[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 transition-all ${isSelected ? 'bg-ink' : isToday ? 'bg-ember/10' : 'hover:bg-canvas'}`}
    >
      <span className={`text-[9px] font-semibold uppercase tracking-wider ${isSelected ? 'text-white/55' : isToday ? 'text-ember' : 'text-ink/30'}`}>
        {letter}
      </span>
      <span className={`text-base font-bold leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>
        {dateStr.slice(8, 10)}
      </span>
      <div className="flex h-2 items-center gap-0.5">
        {entries.length === 0 ? (
          <div className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-ink/10'}`} />
        ) : (
          entries.slice(0, 3).map((entry, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white/60' : DOT_COLOR[entry.type]}`}
            />
          ))
        )}
      </div>
    </button>
  );
}

function DayDetail({
  dateStr,
  entries,
  onAdd,
  onRemove,
}: {
  dateStr: string;
  entries: PlanEntry[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="h-px bg-ink/5" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">
            {cap(dayFullLabel(dateStr))}
          </p>
          <p className="mt-1 text-xs text-ink/35">
            {entries.length > 0 ? `${entries.length} planificadas` : 'Día libre'}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-7 items-center gap-1.5 rounded-xl bg-canvas px-3 text-xs font-medium text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Plus size={12} />Añadir
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-canvas">
            <Sun size={15} className="text-ink/20" />
          </div>
          <span className="text-sm text-ink/30">Sin actividad planificada</span>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const Icon = ACTIVITY_ICONS[entry.type] ?? Target;

            return (
              <div key={`${entry.label}-${index}`} className="group flex items-start gap-3 rounded-2xl bg-canvas px-3 py-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-card">
                  <Icon size={15} className="text-moss" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-ink">{entry.label}</p>
                  {formatEntrySubtitle(entry) ? (
                    <p className="mt-0.5 text-xs text-ink/35">{formatEntrySubtitle(entry)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="flex h-7 w-7 items-center justify-center rounded-xl text-ink/20 transition-colors hover:bg-red-50 hover:text-red-400"
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

function TemplateWeekCard() {
  const template = usePlanStore((state) => state.template);

  return (
    <div className="space-y-3 rounded-4xl bg-white p-4 shadow-card">
      {DAY_NAMES.map((dayName, index) => {
        const entries = template[index] ?? [];

        return (
          <div key={dayName}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">{dayName}</p>
              <span className="text-xs text-ink/35">
                {entries.length === 0 ? 'Libre' : `${entries.length} actividades`}
              </span>
            </div>
            {entries.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {entries.map((entry, entryIndex) => (
                  <span
                    key={`${entry.label}-${entryIndex}`}
                    className="rounded-full bg-canvas px-2 py-1 text-[10px] font-semibold leading-none text-ink/55"
                  >
                    {entry.label}
                  </span>
                ))}
              </div>
            ) : null}
            {index < DAY_NAMES.length - 1 ? <div className="mt-3 h-px bg-ink/5" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function PlanScreen() {
  const today = todayIso();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const current = getDaysForOffset(0);
    return Math.max(0, current.indexOf(today));
  });
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showAddProgram, setShowAddProgram] = useState(false);

  const user = useSessionStore((state) => state.user);
  const { structuredGoals, program, weekPlan } = usePlanStore();
  const { activities, sleepEntries, dailyHealthMetrics } = useRecoveryStore();

  useEffect(() => {
    if (!user) return;
    void PlanService.loadProgram(user.id);
    void PlanService.loadWeekPlan(user.id);
    void PlanService.loadTemplate(user.id);
  }, [user]);

  const days = getDaysForOffset(weekOffset);

  useEffect(() => {
    setSelectedIdx((current) => {
      if (current >= 0 && current < days.length) return current;
      return 0;
    });
  }, [days]);

  const selectedDate = days[selectedIdx] ?? days[0] ?? today;
  const dayEntries = weekPlan[selectedDate] ?? [];
  const weekActivities = useMemo(
    () => activities.filter((activity) => days.includes(activity.date)),
    [activities, days],
  );
  const dayActivityCount = activities.filter((activity) => activity.date === selectedDate).length;
  const daySleepHours = sleepEntries.find((entry) => entry.date === selectedDate)?.durationH ?? 0;
  const dayMovement = dailyHealthMetrics.find((entry) => entry.date === selectedDate);

  function getGoalCurrentValue(goal: StructuredGoal) {
    switch (goal.type) {
      case 'steps_daily':
        return dayMovement?.steps ?? 0;
      case 'active_calories_daily':
        return dayMovement?.activeCalories ?? 0;
      case 'sleep_hours_daily':
        return daySleepHours;
      case 'activity_minutes_weekly':
        return weekActivities.reduce((sum, activity) => sum + (activity.durationMinutes ?? 0), 0);
      case 'activity_sessions_weekly':
        return weekActivities.length;
      case 'training_sessions_daily':
        return dayActivityCount;
    }
  }

  function goToPrevWeek() {
    setWeekOffset((current) => current - 1);
  }

  function goToNextWeek() {
    setWeekOffset((current) => current + 1);
  }

  function goToThisWeek() {
    setWeekOffset(0);
    const current = getDaysForOffset(0);
    setSelectedIdx(Math.max(0, current.indexOf(today)));
  }

  const enabledGoals = structuredGoals.filter((goal) => goal.enabled);

  return (
    <>
      <div className="animate-fade-in space-y-5 px-4 pb-24 pt-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-ink">Plan</h1>
          <p className="text-sm text-ink/40">{weekRangeLabel(days)}</p>
        </div>

        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-ink/30">Esta semana</p>
          <div className="space-y-3 rounded-4xl bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrevWeek}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-canvas text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={weekOffset !== 0 ? goToThisWeek : undefined}
                className={`text-xs font-semibold transition-colors ${weekOffset !== 0 ? 'text-moss hover:text-moss/70' : 'text-ink'}`}
              >
                {weekOffsetLabel(weekOffset)}
              </button>
              <button
                type="button"
                onClick={goToNextWeek}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-canvas text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((dateStr, index) => (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  letter={DAY_LETTERS[index]}
                  isSelected={index === selectedIdx}
                  isToday={dateStr === today}
                  entries={weekPlan[dateStr] ?? []}
                  onClick={() => setSelectedIdx(index)}
                />
              ))}
            </div>

            <DayDetail
              dateStr={selectedDate}
              entries={dayEntries}
              onAdd={() => setShowAddEntry(true)}
              onRemove={(index) => PlanService.removePlanEntry(selectedDate, index)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Objetivos medibles</p>
            <button
              type="button"
              onClick={() => setShowGoals(true)}
              className="flex h-7 items-center gap-1.5 rounded-xl bg-canvas px-3 text-xs font-medium text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <Pencil size={12} />Editar
            </button>
          </div>
          <div className="space-y-4 rounded-4xl bg-white p-5 shadow-card">
            {enabledGoals.length === 0 ? (
              <div className="py-2 text-center">
                <p className="text-sm text-ink/40">Sin objetivos activos</p>
                <p className="mt-1 text-xs font-medium text-ink/30">
                  Define pasos, kcal, sueño o actividad semanal
                </p>
              </div>
            ) : (
              enabledGoals.map((goal, index) => {
                const currentValue = getGoalCurrentValue(goal);
                const progressPct = goal.target > 0 ? Math.round((currentValue / goal.target) * 100) : 0;

                return (
                  <div key={goal.type}>
                    <GoalRow goal={goal} currentValue={currentValue} progressPct={progressPct} />
                    {index < enabledGoals.length - 1 ? <div className="mt-4 h-px bg-ink/5" /> : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-ink/30">Programa activo</p>
          {program ? (
            <ProgramCard name={program.name} currentWeek={program.currentWeek} totalWeeks={program.totalWeeks} />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddProgram(true)}
              className="flex w-full flex-col items-center gap-2 rounded-4xl border border-sand/40 bg-canvas-light p-6 text-center transition-colors hover:bg-canvas"
            >
              <Layers size={22} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin programa activo</p>
              <p className="text-xs font-medium text-ink/30">Pulsa para crear tu programa</p>
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-ink/30">Semana base</p>
          <TemplateWeekCard />
        </div>
      </div>

      <AddPlanEntrySheet isOpen={showAddEntry} dateStr={selectedDate} onClose={() => setShowAddEntry(false)} />
      <GoalsSheet isOpen={showGoals} onClose={() => setShowGoals(false)} />
      {user ? (
        <AddProgramSheet
          isOpen={showAddProgram}
          onClose={() => setShowAddProgram(false)}
          userId={user.id}
        />
      ) : null}
    </>
  );
}

