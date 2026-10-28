'use client';

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  Bike,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
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
import { RecoveryService } from '../lib/services';
import { pickBySourcePrecedence } from '../lib/health-metrics';
import {
  didRehabOn,
  getPlannedActivityMatches,
  isSessionEntry,
  summarizePlanDay,
  type PlanDaySummary,
} from '../lib/plan-matching';
import { useRecoveryStore } from '../stores/recovery-store';
import { useSessionStore } from '../stores/session-store';
import { usePlanStore } from '../stores/plan-store';
import { Portal } from './portal';
import { AddActivitySheet } from './add-activity-sheet';
import { ActivityDetailSheet } from './actividades-screen';
import { DolorSheet } from './dolor-sheet';
import type { ActivityEntry, ActivityType, MuscleGroup } from '../stores/recovery-store';
import type { PlanEntry, PlanActivityType, ActivityPlanEntry, TaskPlanEntry, StructuredGoal, StructuredGoalType } from '../stores/plan-store';

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WEEK_OPTIONS = [4, 6, 8, 10, 12, 16];

const ACTIVITY_OPTIONS: { id: PlanActivityType; label: string; Icon: ElementType }[] = [
  { id: 'gym', label: 'Gym', Icon: Dumbbell },
  { id: 'bike', label: 'Bici', Icon: Bike },
  { id: 'run', label: 'Correr', Icon: SportShoe },
  { id: 'walk', label: 'Caminar', Icon: Footprints },
  { id: 'swim', label: 'Nadar', Icon: Waves },
  { id: 'mobility', label: 'Movilidad', Icon: RefreshCw },
  { id: 'rehab', label: 'Rehab', Icon: HeartPulse },
];

const ACTIVITY_ICONS: Record<PlanActivityType, ElementType> = {
  gym: Dumbbell,
  bike: Bike,
  run: SportShoe,
  walk: Footprints,
  swim: Waves,
  mobility: RefreshCw,
  other: Target,
  rehab: HeartPulse,
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

function dayShortLabel(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return `${cap(date.toLocaleDateString('es-ES', { weekday: 'long' }))} ${date.getDate()}`;
}

function formatEntrySubtitle(entry: PlanEntry) {
  const parts: string[] = [];
  if (entry.time) parts.push(entry.time);
  if (entry.kind === 'task') {
    if (entry.subtitle) parts.push(entry.subtitle);
  } else if (entry.subtitle) {
    parts.push(entry.subtitle);
  } else if (entry.muscleGroups?.length) {
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
  initial?: ActivityPlanEntry;
  submitLabel?: string;
}) {
  const [type, setType] = useState<PlanActivityType>(initial?.type ?? 'gym');
  const [label, setLabel] = useState(initial?.label ?? 'Gym');
  const [time, setTime] = useState(initial?.time ?? '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '');
  const [muscles, setMuscles] = useState<MuscleGroup[]>(initial?.muscleGroups ?? []);
  const [labelEdited, setLabelEdited] = useState(Boolean(initial));

  function handleTypeSelect(nextType: PlanActivityType, defaultLabel: string) {
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
      subtitle: subtitle.trim() || undefined,
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

      <input
        type="text"
        value={subtitle}
        onChange={(event) => setSubtitle(event.target.value)}
        placeholder="Detalle (opcional): 20' · 3 series"
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

function TaskForm({
  onConfirm,
  submitLabel = 'Añadir',
}: {
  onConfirm: (entry: PlanEntry) => void;
  submitLabel?: string;
}) {
  const [label, setLabel] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [time, setTime] = useState('');

  function handleConfirm() {
    if (!label.trim()) return;
    const entry: TaskPlanEntry = {
      kind: 'task',
      id: crypto.randomUUID(),
      label: label.trim(),
      subtitle: subtitle.trim() || undefined,
      time: time || undefined,
      completed: false,
    };
    onConfirm(entry);
  }

  return (
    <div className="space-y-4 rounded-3xl bg-canvas p-4">
      <input
        type="text"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Ej: Cena, Objetivo de sueño..."
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm text-ink shadow-card outline-none placeholder:text-ink/30"
      />
      <input
        type="text"
        value={subtitle}
        onChange={(event) => setSubtitle(event.target.value)}
        placeholder="Detalle (opcional)"
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

function AddPlanEntrySheet({
  isOpen,
  title = 'Añadir al día',
  subtitle,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onAdd: (entry: PlanEntry) => void;
}) {
  const [mode, setMode] = useState<'activity' | 'task'>('activity');

  useEffect(() => {
    if (isOpen) setMode('activity');
  }, [isOpen]);

  function handleConfirm(entry: PlanEntry) {
    onAdd(entry);
    onClose();
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('activity')}
          className={`rounded-2xl py-2.5 text-sm font-semibold transition-all ${mode === 'activity' ? 'bg-ink text-white' : 'bg-canvas text-ink/60'}`}
        >
          Actividad
        </button>
        <button
          type="button"
          onClick={() => setMode('task')}
          className={`rounded-2xl py-2.5 text-sm font-semibold transition-all ${mode === 'task' ? 'bg-ink text-white' : 'bg-canvas text-ink/60'}`}
        >
          Tarea
        </button>
      </div>
      {mode === 'activity' ? (
        <ActivityPicker onConfirm={handleConfirm} />
      ) : (
        <TaskForm onConfirm={handleConfirm} />
      )}
    </Sheet>
  );
}

// ── Base week editor (one weekday of the recurring routine) ──────────────────

function TemplateDaySheet({ dayIndex, onClose }: { dayIndex: number | null; onClose: () => void }) {
  const template = usePlanStore((state) => state.template);
  const [adding, setAdding] = useState(false);

  useEffect(() => { setAdding(false); }, [dayIndex]);

  if (dayIndex === null) return null;
  const entries = template[dayIndex] ?? [];

  return (
    <>
      <Sheet
        isOpen
        onClose={onClose}
        title={`Semana base · ${DAY_NAMES[dayIndex]}`}
        subtitle="Se aplica sola a los próximos días de este tipo"
      >
        {entries.length === 0 ? (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink/60">Día libre en tu rutina.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const Icon = entry.kind === 'task' ? Check : ACTIVITY_ICONS[entry.type] ?? Target;
              return (
                <div key={`${entry.label}-${index}`} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-card">
                    <Icon size={15} className="text-moss" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-ink">{entry.label}</p>
                    {formatEntrySubtitle(entry) ? (
                      <p className="mt-0.5 text-xs text-ink/60">{formatEntrySubtitle(entry)}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => PlanService.removeTemplateEntry(dayIndex, index)}
                    aria-label={`Quitar ${entry.label}`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-ink/40 active:bg-red-50 active:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white"
        >
          <Plus size={14} /> Añadir a {DAY_NAMES[dayIndex].toLowerCase()}
        </button>
        <p className="text-xs text-ink/50">
          Los días que ya tienen plan no cambian. Para actualizarlos usa «Aplicar a esta semana».
        </p>
      </Sheet>
      <AddPlanEntrySheet
        isOpen={adding}
        title={`Añadir a ${DAY_NAMES[dayIndex].toLowerCase()}`}
        subtitle="Semana base"
        onClose={() => setAdding(false)}
        onAdd={(entry) => PlanService.addTemplateEntry(dayIndex, entry)}
      />
    </>
  );
}

function BaseWeekCard({
  weekIsPast,
  onEditDay,
  onApply,
}: {
  weekIsPast: boolean;
  onEditDay: (dayIndex: number) => void;
  onApply: () => void;
}) {
  const template = usePlanStore((state) => state.template);
  const isEmpty = DAY_NAMES.every((_, index) => (template[index] ?? []).length === 0);
  const [open, setOpen] = useState(isEmpty);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-ink/50">Mi semana base</p>
      <div className="rounded-4xl bg-white p-5 shadow-card">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-ink">Tu rutina fija</p>
            <p className="mt-0.5 text-xs text-ink/60">
              {isEmpty
                ? 'Defínela una vez y se aplicará sola cada semana.'
                : 'Se aplica sola a los próximos 14 días.'}
            </p>
          </div>
          <ChevronDown size={18} className={`flex-shrink-0 text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open ? (
          <div className="mt-4 space-y-1">
            {DAY_NAMES.map((dayName, index) => {
              const entries = template[index] ?? [];
              return (
                <button
                  key={dayName}
                  type="button"
                  onClick={() => onEditDay(index)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left active:bg-canvas"
                >
                  <span className="w-20 flex-shrink-0 text-[11px] font-semibold uppercase tracking-widest text-ink/50">{dayName}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                    {entries.length === 0 ? (
                      <span className="text-xs text-ink/40">Libre</span>
                    ) : (
                      entries.map((entry, entryIndex) => (
                        <span key={`${entry.label}-${entryIndex}`} className="rounded-full bg-canvas px-2 py-1 text-[11px] font-semibold leading-none text-ink/70">
                          {entry.label}
                        </span>
                      ))
                    )}
                  </span>
                  <ChevronRight size={14} className="flex-shrink-0 text-ink/30" />
                </button>
              );
            })}

            {!isEmpty && !weekIsPast ? (
              <button
                type="button"
                onClick={() => {
                  if (!armed) { setArmed(true); return; }
                  setArmed(false);
                  onApply();
                }}
                className={`mt-3 w-full rounded-2xl py-3 text-sm font-semibold transition-colors ${
                  armed ? 'bg-ember text-white' : 'bg-canvas text-ink'
                }`}
              >
                {armed ? 'Confirmar: sustituye los días desde hoy' : 'Aplicar a esta semana'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Week strip ────────────────────────────────────────────────────────────────

function DayCell({
  dateStr,
  letter,
  isSelected,
  isToday,
  summary,
  onClick,
}: {
  dateStr: string;
  letter: string;
  isSelected: boolean;
  isToday: boolean;
  summary: PlanDaySummary;
  onClick: () => void;
}) {
  const { status, sessionsDone, sessionsTotal } = summary;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dateStr}
      aria-pressed={isSelected}
      className={`flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition-all ${isSelected ? 'bg-ink' : isToday ? 'bg-ember/10' : 'active:bg-canvas'}`}
    >
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isSelected ? 'text-white/70' : isToday ? 'text-ember/80' : 'text-ink/50'}`}>
        {letter}
      </span>
      <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : isToday ? 'text-ember' : 'text-ink'}`}>
        {dateStr.slice(8, 10)}
      </span>
      <span className="flex h-4 items-center justify-center">
        {status === 'free' ? (
          <span className={`text-[11px] leading-4 ${isSelected ? 'text-white/40' : 'text-ink/25'}`}>–</span>
        ) : status === 'done' ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-moss">
            <Check size={10} strokeWidth={3} className="text-white" />
          </span>
        ) : (
          <span className={`text-[11px] font-bold leading-4 ${status === 'missed' ? 'text-ember' : isSelected ? 'text-white/80' : 'text-ink/60'}`}>
            {sessionsDone}/{sessionsTotal}
          </span>
        )}
      </span>
    </button>
  );
}

// ── Day detail ────────────────────────────────────────────────────────────────

function DayDetail({
  dateStr,
  entries,
  activities,
  rehabDone,
  isPast,
  isEditing,
  onToggleEdit,
  onAdd,
  onRemove,
  onToggleTask,
  onSession,
}: {
  dateStr: string;
  entries: PlanEntry[];
  activities: ActivityEntry[];
  rehabDone: boolean;
  isPast: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onToggleTask: (index: number, entry: TaskPlanEntry) => void;
  onSession: (entry: ActivityPlanEntry, matched: ActivityEntry | null, done: boolean) => void;
}) {
  const sessions = entries.filter(isSessionEntry);
  const matches = new Map(getPlannedActivityMatches(sessions, activities).map((m) => [m.entry, m.matchedActivity]));
  const done = (entry: ActivityPlanEntry) => (entry.type === 'rehab' ? rehabDone : !!matches.get(entry));
  const sessionsDone = sessions.filter(done).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{dayShortLabel(dateStr)}</p>
          <p className="mt-0.5 text-xs text-ink/60">
            {sessions.length > 0
              ? `${sessionsDone} de ${sessions.length} ${sessions.length === 1 ? 'sesión' : 'sesiones'}`
              : entries.length > 0 ? 'Solo tareas' : 'Día libre'}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={onToggleEdit}
              className={`flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${isEditing ? 'bg-ink text-white' : 'bg-canvas text-ink/70'}`}
            >
              {isEditing ? 'Listo' : <><Pencil size={12} /> Editar</>}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-canvas px-3 text-xs font-semibold text-ink/70 active:bg-ink/5"
          >
            <Plus size={12} /> Añadir
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white">
            <Sun size={15} className="text-ink/30" />
          </div>
          <span className="text-sm text-ink/60">Nada planificado: descanso.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const isTask = entry.kind === 'task';
            const isDone = isTask ? entry.completed : done(entry);
            const matched = isTask ? null : matches.get(entry) ?? null;
            const Icon = isTask ? Check : ACTIVITY_ICONS[entry.type] ?? Target;
            const actionable = isTask || !isDone || !!matched;

            return (
              <div key={`${entry.label}-${index}`} className="flex items-center gap-2 rounded-2xl bg-canvas pl-3 pr-2 py-2.5">
                <button
                  type="button"
                  disabled={isEditing || !actionable}
                  onClick={() => (isTask ? onToggleTask(index, entry) : onSession(entry, matched, isDone))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                      isDone ? 'bg-moss' : isPast && !isTask ? 'border-[1.5px] border-ember/50' : 'border-[1.5px] border-ink/20'
                    }`}
                  >
                    {isDone ? <Check size={12} strokeWidth={3} className="text-white" /> : null}
                  </span>
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-card">
                    <Icon size={15} className="text-moss" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium leading-snug ${isTask && entry.completed ? 'text-ink/50 line-through' : 'text-ink'}`}>
                      {entry.label}
                    </span>
                    {formatEntrySubtitle(entry) ? (
                      <span className="mt-0.5 block text-xs text-ink/60">{formatEntrySubtitle(entry)}</span>
                    ) : null}
                  </span>
                </button>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    aria-label={`Quitar ${entry.label}`}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-ink/40 active:bg-red-50 active:text-red-400"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            );
          })}
          {!isEditing && sessions.some((entry) => !done(entry)) ? (
            <p className="px-1 text-[11px] text-ink/50">
              Toca una sesión pendiente para registrarla. Las de Strava y COROS se marcan solas.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Goals: consistency over the week ─────────────────────────────────────────

type DayGoalState = 'met' | 'missed' | 'open';

function DailyGoalRow({
  goal,
  states,
  letters,
}: {
  goal: StructuredGoal;
  states: DayGoalState[];
  letters: string[];
}) {
  const meta = STRUCTURED_GOAL_META[goal.type];
  const Icon = meta.Icon;
  const elapsed = states.filter((state) => state !== 'open').length;
  const met = states.filter((state) => state === 'met').length;
  const target = goal.type === 'sleep_hours_daily' ? `${goal.target} ${meta.unit}` : `${Math.round(goal.target).toLocaleString('es-ES')} ${meta.unit}`;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-canvas">
            <Icon size={15} className={meta.color} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-snug text-ink">{meta.label}</p>
            <p className="mt-0.5 text-xs text-ink/60">Objetivo {target}</p>
          </div>
        </div>
        <span className="flex-shrink-0 text-xs font-bold tabular-nums text-ink/70">
          {met}/{elapsed || 0} {elapsed === 1 ? 'día' : 'días'}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {states.map((state, index) => (
          <div key={index} className="space-y-1">
            <div
              className={`h-2 rounded-full ${state === 'met' ? 'bg-moss' : state === 'missed' ? 'bg-ember/40' : 'bg-ink/10'}`}
            />
            <p className="text-center text-[9px] font-semibold text-ink/40">{letters[index]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyGoalRow({ goal, current }: { goal: StructuredGoal; current: number }) {
  const meta = STRUCTURED_GOAL_META[goal.type];
  const Icon = meta.Icon;
  const pct = goal.target > 0 ? Math.round((current / goal.target) * 100) : 0;
  const reached = pct >= 100;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-canvas">
            <Icon size={15} className={meta.color} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-snug text-ink">{meta.label}</p>
            <p className="mt-0.5 text-xs text-ink/60">
              {Math.round(current).toLocaleString('es-ES')} / {Math.round(goal.target).toLocaleString('es-ES')} {meta.unit}
            </p>
          </div>
        </div>
        <span className={`flex-shrink-0 text-xs font-bold tabular-nums ${reached ? 'text-moss' : 'text-ink/70'}`}>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
        <div className={`h-full rounded-full transition-all duration-700 ${'bg-moss'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function PlanScreen() {
  const today = todayIso();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const current = getDaysForOffset(0);
    return Math.max(0, current.indexOf(today));
  });
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [templateDay, setTemplateDay] = useState<number | null>(null);
  const [fetchedActivities, setFetchedActivities] = useState<ActivityEntry[]>([]);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [prefill, setPrefill] = useState<{ type: ActivityType; muscleGroups?: MuscleGroup[] } | undefined>(undefined);
  const [editActivity, setEditActivity] = useState<ActivityEntry | undefined>(undefined);
  const [detailActivity, setDetailActivity] = useState<ActivityEntry | null>(null);
  const [showDolor, setShowDolor] = useState(false);

  const user = useSessionStore((state) => state.user);
  const { structuredGoals, weekPlan } = usePlanStore();
  const { activities: storeActivities, sleepEntries, dailyHealthMetrics, checkIns, injuryLogs } = useRecoveryStore();

  useEffect(() => {
    if (!user) return;
    void PlanService.syncFromTemplate(user.id);
  }, [user]);

  // The store only keeps recent activities; load the last months so past weeks are accurate.
  function loadActivities() {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 120);
    RecoveryService.fetchActivitiesFrom(user.id, since).then(setFetchedActivities).catch(() => {});
  }
  useEffect(loadActivities, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const allActivities = useMemo(() => {
    const byId = new Map<string, ActivityEntry>();
    for (const activity of [...fetchedActivities, ...storeActivities]) byId.set(activity.id, activity);
    return [...byId.values()];
  }, [fetchedActivities, storeActivities]);

  const days = getDaysForOffset(weekOffset);

  useEffect(() => {
    setSelectedIdx((current) => (current >= 0 && current < days.length ? current : 0));
    setIsEditing(false);
  }, [days]);

  const selectedDate = days[selectedIdx] ?? days[0] ?? today;
  const dayEntries = weekPlan[selectedDate] ?? [];
  const weekIsPast = days[6] < today;

  const summaries = useMemo(
    () => days.map((date) =>
      summarizePlanDay({
        entries: weekPlan[date] ?? [],
        activities: allActivities,
        rehabDone: didRehabOn(date, checkIns, injuryLogs),
        date,
        today,
      })),
    [days, weekPlan, allActivities, checkIns, injuryLogs, today],
  );
  const sessionsTotal = summaries.reduce((sum, s) => sum + s.sessionsTotal, 0);
  const sessionsDone = summaries.reduce((sum, s) => sum + s.sessionsDone, 0);
  const sessionsPending = sessionsTotal - sessionsDone;
  const sessionsPct = sessionsTotal > 0 ? Math.round((sessionsDone / sessionsTotal) * 100) : 0;

  const weekActivities = useMemo(
    () => allActivities.filter((activity) => days.includes(activity.date)),
    [allActivities, days],
  );

  function dailyValue(goal: StructuredGoal, date: string): number {
    switch (goal.type) {
      case 'steps_daily': return pickBySourcePrecedence(dailyHealthMetrics, date)?.steps ?? 0;
      case 'active_calories_daily': return pickBySourcePrecedence(dailyHealthMetrics, date)?.activeCalories ?? 0;
      case 'sleep_hours_daily': return pickBySourcePrecedence(sleepEntries, date)?.durationH ?? 0;
      case 'training_sessions_daily': return allActivities.filter((a) => a.date === date).length;
      default: return 0;
    }
  }

  function weeklyValue(goal: StructuredGoal): number {
    if (goal.type === 'activity_minutes_weekly') {
      return weekActivities.reduce((sum, activity) => sum + (activity.durationMinutes ?? 0), 0);
    }
    return weekActivities.length;
  }

  function dayStates(goal: StructuredGoal): DayGoalState[] {
    return days.map((date) => {
      const met = dailyValue(goal, date) >= goal.target;
      if (met) return 'met';
      return date < today ? 'missed' : 'open';
    });
  }

  function handleSession(entry: ActivityPlanEntry, matched: ActivityEntry | null, done: boolean) {
    if (matched) { setDetailActivity(matched); return; }
    if (done || selectedDate > today) return;
    if (entry.type === 'rehab') { setShowDolor(true); return; }
    setEditActivity(undefined);
    setPrefill({ type: entry.type, muscleGroups: entry.muscleGroups });
    setShowAddActivity(true);
  }

  const enabledGoals = structuredGoals.filter((goal) => goal.enabled);
  const dailyGoals = enabledGoals.filter((goal) => STRUCTURED_GOAL_META[goal.type].cadence === 'daily');
  const weeklyGoals = enabledGoals.filter((goal) => STRUCTURED_GOAL_META[goal.type].cadence === 'weekly');

  const headline = sessionsTotal === 0 ? 'Semana libre' : `${sessionsDone} de ${sessionsTotal} sesiones`;
  const subline = sessionsTotal === 0
    ? 'Sin sesiones planificadas'
    : weekIsPast
      ? `${sessionsPct}% cumplido`
      : sessionsPending === 0
        ? 'Semana completada'
        : `${sessionsPending} ${sessionsPending === 1 ? 'pendiente' : 'pendientes'}`;

  return (
    <>
      <div className="animate-fade-in space-y-5 px-4 pb-24 pt-4">
        <h1 className="px-1 text-2xl font-bold text-ink">Plan</h1>

        {/* ── Week: summary, strip and day ── */}
        <div className="space-y-4 rounded-4xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{weekOffsetLabel(weekOffset)}</p>
              <p className="text-xs text-ink/60">{weekRangeLabel(days)}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {weekOffset !== 0 ? (
                <button
                  type="button"
                  onClick={() => { setWeekOffset(0); setSelectedIdx(Math.max(0, getDaysForOffset(0).indexOf(today))); }}
                  className="h-8 rounded-xl bg-ink px-3 text-xs font-semibold text-white active:scale-95 transition-transform"
                >
                  Hoy
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setWeekOffset((current) => current - 1)}
                aria-label="Semana anterior"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-canvas text-ink/60 active:scale-95 transition-transform"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((current) => current + 1)}
                aria-label="Semana siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-canvas text-ink/60 active:scale-95 transition-transform"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 rounded-3xl bg-canvas p-4">
            <div className="flex items-end justify-between gap-2">
              <p className="text-lg font-bold leading-tight text-ink">{headline}</p>
              <p className={`text-xs font-medium ${sessionsTotal > 0 && sessionsPending === 0 ? 'text-moss' : 'text-ink/60'}`}>{subline}</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-moss transition-all duration-700" style={{ width: `${sessionsPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((dateStr, index) => (
              <DayCell
                key={dateStr}
                dateStr={dateStr}
                letter={DAY_LETTERS[index]}
                isSelected={index === selectedIdx}
                isToday={dateStr === today}
                summary={summaries[index]}
                onClick={() => { setSelectedIdx(index); setIsEditing(false); }}
              />
            ))}
          </div>

          <div className="h-px bg-ink/5" />

          <DayDetail
            dateStr={selectedDate}
            entries={dayEntries}
            activities={allActivities.filter((a) => a.date === selectedDate)}
            rehabDone={didRehabOn(selectedDate, checkIns, injuryLogs)}
            isPast={selectedDate < today}
            isEditing={isEditing}
            onToggleEdit={() => setIsEditing((value) => !value)}
            onAdd={() => setShowAddEntry(true)}
            onRemove={(index) => PlanService.removePlanEntry(selectedDate, index)}
            onToggleTask={(index, entry) => PlanService.updatePlanEntry(selectedDate, index, { ...entry, completed: !entry.completed })}
            onSession={handleSession}
          />
        </div>

        {/* ── Goals: how consistent you were this week ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">Objetivos de la semana</p>
            <button
              type="button"
              onClick={() => setShowGoals(true)}
              className="flex h-7 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-ink/70 shadow-card active:scale-95 transition-transform"
            >
              <Pencil size={12} /> Editar
            </button>
          </div>
          <div className="space-y-5 rounded-4xl bg-white p-5 shadow-card">
            {enabledGoals.length === 0 ? (
              <div className="py-2 text-center">
                <p className="text-sm text-ink/60">Sin objetivos activos</p>
                <p className="mt-1 text-xs text-ink/50">Define pasos, kcal, sueño o actividad semanal</p>
              </div>
            ) : (
              <>
                {weeklyGoals.map((goal) => (
                  <WeeklyGoalRow key={goal.type} goal={goal} current={weeklyValue(goal)} />
                ))}
                {dailyGoals.map((goal) => (
                  <DailyGoalRow key={goal.type} goal={goal} states={dayStates(goal)} letters={DAY_LETTERS} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Recurring routine ── */}
        <BaseWeekCard
          weekIsPast={weekIsPast}
          onEditDay={setTemplateDay}
          onApply={() => PlanService.applyTemplateToDates(days.filter((date) => date >= today))}
        />
      </div>

      <AddPlanEntrySheet
        isOpen={showAddEntry}
        subtitle={cap(dayFullLabel(selectedDate))}
        onClose={() => setShowAddEntry(false)}
        onAdd={(entry) => PlanService.addPlanEntry(selectedDate, entry)}
      />
      <GoalsSheet isOpen={showGoals} onClose={() => setShowGoals(false)} />
      <TemplateDaySheet dayIndex={templateDay} onClose={() => setTemplateDay(null)} />
      <AddActivitySheet
        isOpen={showAddActivity}
        onClose={() => { setShowAddActivity(false); setEditActivity(undefined); setPrefill(undefined); loadActivities(); }}
        editActivity={editActivity}
        prefill={prefill}
        defaultDate={selectedDate}
      />
      <ActivityDetailSheet
        act={detailActivity}
        onClose={() => setDetailActivity(null)}
        onEdit={(activity) => { setDetailActivity(null); setEditActivity(activity); setShowAddActivity(true); }}
        onDelete={(id) => { setDetailActivity(null); void Promise.resolve(RecoveryService.deleteActivity(id)).then(loadActivities); }}
      />
      <DolorSheet isOpen={showDolor} onClose={() => setShowDolor(false)} defaultDate={selectedDate} />
    </>
  );
}
