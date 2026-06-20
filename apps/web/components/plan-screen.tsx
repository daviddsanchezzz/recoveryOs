'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dumbbell, Bike, Footprints, Waves, HeartPulse, RefreshCw, SportShoe,
  Target, Layers, Sun, Clock, Plus, X, ChevronRight, ChevronLeft, Pencil,
} from 'lucide-react';
import { weekDates, todayIso } from '../lib/date';
import { usePlanStore } from '../stores/plan-store';
import { PlanService } from '../lib/plan-service';
import { useSessionStore } from '../stores/session-store';
import { Portal } from './portal';
import type { ActivityType, MuscleGroup } from '../stores/recovery-store';
import type { PlanEntry } from '../stores/plan-store';

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_LETTERS  = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES    = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const WEEK_OPTIONS = [4, 6, 8, 10, 12, 16];

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

const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'pecho',   label: 'Pecho'   },
  { id: 'espalda', label: 'Espalda' },
  { id: 'biceps',  label: 'Bíceps'  },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'hombro',  label: 'Hombro'  },
  { id: 'core',    label: 'Core'    },
  { id: 'pierna',  label: 'Pierna'  },
  { id: 'gluteo',  label: 'Glúteo'  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function weekRangeLabel(days: string[]): string {
  const first = new Date(days[0] + 'T12:00:00');
  const last  = new Date(days[6] + 'T12:00:00');
  const month = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()}–${last.getDate()} ${month(last)}`
    : `${first.getDate()} ${month(first)} – ${last.getDate()} ${month(last)}`;
}

function weekOffsetLabel(offset: number): string {
  if (offset === 0)  return 'Esta semana';
  if (offset === -1) return 'Semana pasada';
  if (offset === 1)  return 'Próxima semana';
  return offset < 0 ? `Hace ${Math.abs(offset)} semanas` : `En ${offset} semanas`;
}

function dayFullLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function getDaysForOffset(offset: number): string[] {
  const base = new Date();
  base.setDate(base.getDate() + offset * 7);
  return weekDates(base);
}

// ── Shared sheet wrapper ───────────────────────────────────────────────────

function Sheet({ isOpen, onClose, title, subtitle, children }: {
  isOpen: boolean; onClose: () => void;
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-card-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="px-6 pt-6 pb-2 sticky top-0 bg-white">
          <div className="w-10 h-1 rounded-full bg-ink/10 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink/40 mt-0.5">{subtitle}</p>}
        </div>
        <div className="px-6 pb-8 pt-4 space-y-5">{children}</div>
      </div>
    </Portal>
  );
}

// ── Activity picker (shared by plan entry + template) ─────────────────────

function gymLabel(muscles: MuscleGroup[]): string {
  if (muscles.length === 0) return 'Gym';
  return `Gym ${muscles.map((m) => MUSCLE_GROUPS.find((mg) => mg.id === m)?.label ?? m).join(', ')}`;
}

function ActivityPicker({ onAdd }: { onAdd: (entry: PlanEntry) => void }) {
  const [type,         setType]         = useState<ActivityType>('gym');
  const [label,        setLabel]        = useState('Gym');
  const [time,         setTime]         = useState('');
  const [muscles,      setMuscles]      = useState<MuscleGroup[]>([]);
  const [labelEdited,  setLabelEdited]  = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);

  function handleTypeSelect(id: ActivityType, defaultLabel: string) {
    setType(id);
    setMuscles([]);
    setLabel(defaultLabel);
    setLabelEdited(false);
    labelRef.current?.focus();
  }

  function toggleMuscle(id: MuscleGroup) {
    setMuscles((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      if (!labelEdited) setLabel(gymLabel(next));
      return next;
    });
  }

  function handleLabelChange(val: string) {
    setLabel(val);
    setLabelEdited(true);
  }

  function handleAdd() {
    if (!label.trim()) return;
    onAdd({
      type,
      label: label.trim(),
      time: time || undefined,
      muscleGroups: type === 'gym' && muscles.length > 0 ? muscles : undefined,
    });
    setType('gym'); setLabel('Gym'); setTime(''); setMuscles([]); setLabelEdited(false);
  }

  return (
    <div className="space-y-4 rounded-3xl bg-canvas p-4">
      {/* Type grid */}
      <div className="grid grid-cols-4 gap-2">
        {ACTIVITY_OPTIONS.map(({ id, label: lbl, Icon }) => (
          <button
            key={id} type="button" onClick={() => handleTypeSelect(id, lbl)}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
              type === id ? 'bg-ink' : 'bg-white shadow-card'
            }`}
          >
            <Icon size={15} className={type === id ? 'text-white' : 'text-ink/50'} />
            <span className={`text-[9px] font-semibold leading-none ${type === id ? 'text-white/80' : 'text-ink/40'}`}>
              {lbl}
            </span>
          </button>
        ))}
      </div>

      {/* Muscle groups — only for gym */}
      {type === 'gym' && (
        <div>
          <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">Zona muscular</p>
          <div className="grid grid-cols-4 gap-1.5">
            {MUSCLE_GROUPS.map(({ id, label: lbl }) => (
              <button
                key={id} type="button" onClick={() => toggleMuscle(id)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  muscles.includes(id) ? 'bg-ink text-white' : 'bg-white shadow-card text-ink/50'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Label */}
      <input
        ref={labelRef}
        type="text"
        value={label}
        onChange={(e) => handleLabelChange(e.target.value)}
        placeholder="Descripción…"
        className="w-full bg-white rounded-2xl px-4 py-3 text-sm text-ink placeholder-ink/30 outline-none shadow-card"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />

      {/* Time + confirm */}
      <div className="flex gap-2">
        <input
          type="time" value={time} onChange={(e) => setTime(e.target.value)}
          className="bg-white rounded-2xl px-4 py-3 text-sm text-ink outline-none shadow-card w-[120px] flex-shrink-0"
        />
        <button
          type="button" onClick={handleAdd} disabled={!label.trim()}
          className="flex-1 bg-ink text-white rounded-2xl py-3 text-sm font-semibold disabled:opacity-30"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}

// ── Add plan entry sheet ───────────────────────────────────────────────────

function AddPlanEntrySheet({ isOpen, dateStr, onClose }: {
  isOpen: boolean; dateStr: string; onClose: () => void;
}) {
  const addPlanEntry = usePlanStore((s) => s.addPlanEntry);
  return (
    <Sheet isOpen={isOpen} onClose={onClose}
      title="Añadir actividad" subtitle={cap(dayFullLabel(dateStr))}>
      <ActivityPicker onAdd={(entry) => { addPlanEntry(dateStr, entry); onClose(); }} />
    </Sheet>
  );
}

// ── Add goal sheet ─────────────────────────────────────────────────────────

function AddGoalSheet({ isOpen, onClose, userId }: {
  isOpen: boolean; onClose: () => void; userId: string;
}) {
  const [label,    setLabel]    = useState('');
  const [progress, setProgress] = useState(0);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => { if (!isOpen) { setLabel(''); setProgress(0); } }, [isOpen]);

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
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus
          placeholder="Ej: Recuperar tobillo, Correr 10 km…"
          className="w-full bg-canvas rounded-2xl px-4 py-3 text-sm text-ink placeholder-ink/30 outline-none" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-widest">Progreso inicial</p>
          <span className="text-sm font-bold text-ink">{progress}%</span>
        </div>
        <input type="range" min="0" max="100" value={progress}
          onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-moss" />
        <div className="h-1.5 rounded-full bg-canvas overflow-hidden mt-2">
          <div className="h-full rounded-full bg-moss transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <button type="button" onClick={handleAdd} disabled={!label.trim() || loading}
        className="w-full bg-ink text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-30">
        {loading ? 'Guardando…' : 'Añadir objetivo'}
      </button>
    </Sheet>
  );
}

// ── Add program sheet ──────────────────────────────────────────────────────

function AddProgramSheet({ isOpen, onClose, userId }: {
  isOpen: boolean; onClose: () => void; userId: string;
}) {
  const [name,       setName]       = useState('');
  const [totalWeeks, setTotalWeeks] = useState(8);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => { if (!isOpen) { setName(''); setTotalWeeks(8); } }, [isOpen]);

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
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
          placeholder="Ej: Recuperación tibial posterior…"
          className="w-full bg-canvas rounded-2xl px-4 py-3 text-sm text-ink placeholder-ink/30 outline-none" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-ink/40 mb-2.5 uppercase tracking-widest">Duración</p>
        <div className="grid grid-cols-3 gap-2">
          {WEEK_OPTIONS.map((w) => (
            <button key={w} type="button" onClick={() => setTotalWeeks(w)}
              className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
                totalWeeks === w ? 'bg-ink text-white' : 'bg-canvas text-ink/60'
              }`}>
              {w} semanas
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={handleCreate} disabled={!name.trim() || loading}
        className="w-full bg-ink text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-30">
        {loading ? 'Creando…' : 'Crear programa'}
      </button>
    </Sheet>
  );
}

// ── Edit template sheet ────────────────────────────────────────────────────

function EditTemplateSheet({ isOpen, onClose, onApply }: {
  isOpen: boolean; onClose: () => void; onApply: () => void;
}) {
  const { template, addTemplateEntry, removeTemplateEntry } = usePlanStore();
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const hasAny = Object.values(template).some((arr) => arr.length > 0);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Semana base">
      <p className="text-sm text-ink/40 -mt-2">
        Define tus actividades habituales por día. Puedes aplicarlas a cualquier semana como punto de partida.
      </p>

      <div className="space-y-1">
        {DAY_NAMES.map((dayName, i) => {
          const entries  = template[i] ?? [];
          const isAdding = addingDay === i;
          return (
            <div key={i} className="rounded-3xl bg-canvas overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-[11px] font-bold text-ink/40 w-5 uppercase">{DAY_LETTERS[i]}</span>
                <span className="text-sm font-medium text-ink flex-1">{dayName}</span>
                <button type="button" onClick={() => setAddingDay(isAdding ? null : i)}
                  className={`h-7 w-7 rounded-xl flex items-center justify-center transition-colors ${
                    isAdding ? 'bg-ink text-white' : 'bg-white shadow-card text-ink/40 hover:text-ink'
                  }`}>
                  {isAdding ? <X size={13} /> : <Plus size={13} />}
                </button>
              </div>

              {entries.length > 0 && (
                <div className="px-4 pb-3 space-y-2">
                  {entries.map((entry, j) => {
                    const Icon = ACTIVITY_ICONS[entry.type] ?? Target;
                    return (
                      <div key={j} className="flex items-center gap-2.5 group">
                        <div className="h-7 w-7 rounded-xl bg-white shadow-card flex items-center justify-center flex-shrink-0">
                          <Icon size={13} className="text-moss" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-ink">{entry.label}</span>
                          {entry.muscleGroups && entry.muscleGroups.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {entry.muscleGroups.map((m) => (
                                <span key={m} className="text-[9px] font-bold text-moss bg-moss/10 rounded-full px-1.5 py-0.5">
                                  {MUSCLE_GROUPS.find((mg) => mg.id === m)?.label ?? m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => removeTemplateEntry(i, j)}
                          className="h-6 w-6 rounded-lg flex items-center justify-center text-ink/20 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {isAdding && (
                <div className="px-4 pb-4">
                  <ActivityPicker onAdd={(entry) => { addTemplateEntry(i, entry); setAddingDay(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasAny && (
        <button type="button" onClick={() => { onApply(); onClose(); }}
          className="w-full bg-moss text-white rounded-2xl py-3.5 text-sm font-semibold">
          Aplicar a esta semana
        </button>
      )}
    </Sheet>
  );
}

// ── Day cell ───────────────────────────────────────────────────────────────

function DayCell({ dateStr, letter, isSelected, isToday, entries, onClick }: {
  dateStr: string; letter: string; isSelected: boolean;
  isToday: boolean; entries: PlanEntry[]; onClick: () => void;
}) {
  const dayNum = parseInt(dateStr.split('-')[2], 10);
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-150 ${
        isSelected ? 'bg-ink' : 'hover:bg-canvas'
      }`}>
      <span className={`text-[9px] font-semibold uppercase tracking-wider ${isSelected ? 'text-white/50' : 'text-ink/30'}`}>
        {letter}
      </span>
      <span className={`text-sm font-bold leading-none ${isSelected ? 'text-white' : isToday ? 'text-moss' : 'text-ink'}`}>
        {dayNum}
      </span>
      <div className="flex gap-0.5 items-center h-2">
        {entries.length === 0 ? (
          <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-ink/10'}`} />
        ) : (
          entries.slice(0, 3).map((e, j) => (
            <div key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : DOT_COLOR[e.type]}`} />
          ))
        )}
      </div>
    </button>
  );
}

// ── Day detail ─────────────────────────────────────────────────────────────

function DayDetail({ dateStr, entries, onAdd, onRemove }: {
  dateStr: string; entries: PlanEntry[];
  onAdd: () => void; onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="h-px bg-ink/5" />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-ink/40 px-1">{cap(dayFullLabel(dateStr))}</p>
        <button type="button" onClick={onAdd}
          className="h-7 w-7 rounded-xl bg-canvas flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors">
          <Plus size={14} />
        </button>
      </div>

      {entries.length === 0 ? (
        <button type="button" onClick={onAdd} className="flex items-center gap-3 px-1 pb-1 w-full text-left group">
          <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
            <Sun size={15} className="text-ink/20" />
          </div>
          <span className="text-sm text-ink/30 group-hover:text-ink/50 transition-colors">Día libre — pulsa para añadir</span>
        </button>
      ) : (
        <div className="space-y-1.5 pb-1">
          {entries.map((entry, i) => {
            const Icon = ACTIVITY_ICONS[entry.type] ?? Target;
            return (
              <div key={i} className="flex items-start gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-moss" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-ink leading-snug">{entry.label}</span>
                  {entry.muscleGroups && entry.muscleGroups.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {entry.muscleGroups.map((m) => (
                        <span key={m} className="text-[9px] font-bold text-moss bg-moss/10 rounded-full px-1.5 py-0.5 leading-none">
                          {MUSCLE_GROUPS.find((mg) => mg.id === m)?.label ?? m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {entry.time && (
                  <span className="text-xs text-ink/35 tabular-nums flex items-center gap-1 flex-shrink-0 mt-1">
                    <Clock size={10} className="text-ink/25" />{entry.time}
                  </span>
                )}
                <button type="button" onClick={() => onRemove(i)}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-ink/20 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 mt-1.5">
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
  id: string; label: string; progressPct: number; onDelete: () => void;
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
          <button type="button" onClick={onDelete}
            className="h-6 w-6 rounded-lg flex items-center justify-center text-ink/20 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}

// ── Program card ───────────────────────────────────────────────────────────

function ProgramCard({ name, currentWeek, totalWeeks }: {
  name: string; currentWeek: number; totalWeeks: number;
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

// ── Template read view ─────────────────────────────────────────────────────

function TemplateReadView({ onEdit }: { onEdit: () => void }) {
  const template = usePlanStore((s) => s.template);
  const hasAny   = Object.values(template).some((arr) => arr.length > 0);

  if (!hasAny) {
    return (
      <button type="button" onClick={onEdit}
        className="w-full rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center hover:bg-canvas transition-colors">
        <Pencil size={20} className="text-ink/20" />
        <p className="text-sm text-ink/40">Sin semana base configurada</p>
        <p className="text-xs text-ink/30 font-medium">Pulsa para definir tu rutina semanal</p>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {DAY_NAMES.map((dayName, i) => {
        const entries = template[i] ?? [];

        if (entries.length === 0) {
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl">
              <span className="text-[10px] font-bold text-ink/20 uppercase w-4 flex-shrink-0">{DAY_LETTERS[i]}</span>
              <span className="text-xs text-ink/20">Libre</span>
            </div>
          );
        }

        return (
          <div key={i} className="rounded-3xl bg-white shadow-card overflow-hidden">
            {/* Day header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <div className="h-8 w-8 rounded-xl bg-ink flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-white uppercase">{DAY_LETTERS[i]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-ink">{dayName}</span>
              </div>
              <span className="text-[10px] font-medium text-ink/25 bg-canvas rounded-xl px-2.5 py-1">
                {entries.length} {entries.length === 1 ? 'actividad' : 'actividades'}
              </span>
            </div>

            {/* Activities */}
            <div className="px-4 pb-4 space-y-2">
              {entries.map((entry, j) => {
                const Icon = ACTIVITY_ICONS[entry.type] ?? Target;
                return (
                  <div key={j} className="flex items-start gap-3 bg-canvas rounded-2xl px-3.5 py-3">
                    <div className="h-8 w-8 rounded-xl bg-white shadow-card flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-moss" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-ink leading-snug">{entry.label}</span>
                      {entry.muscleGroups && entry.muscleGroups.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {entry.muscleGroups.map((m) => (
                            <span key={m} className="text-[9px] font-bold text-moss bg-moss/10 rounded-full px-2 py-0.5 leading-none">
                              {MUSCLE_GROUPS.find((mg) => mg.id === m)?.label ?? m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {entry.time && (
                      <div className="flex items-center gap-1 flex-shrink-0 bg-white shadow-card rounded-xl px-2.5 py-1.5 mt-0.5">
                        <Clock size={10} className="text-ink/30" />
                        <span className="text-[11px] font-semibold text-ink/50 tabular-nums">{entry.time}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export function PlanScreen() {
  const today = todayIso();

  const [weekOffset,        setWeekOffset]        = useState(0);
  const [selectedIdx,       setSelectedIdx]       = useState(() => {
    const current = getDaysForOffset(0);
    return Math.max(0, current.indexOf(today));
  });
  const [showAddEntry,      setShowAddEntry]      = useState(false);
  const [showAddGoal,       setShowAddGoal]       = useState(false);
  const [showAddProgram,    setShowAddProgram]    = useState(false);
  const [showEditTemplate,  setShowEditTemplate]  = useState(false);

  const user = useSessionStore((s) => s.user);
  const { goals, program, weekPlan, removePlanEntry, template, addPlanEntry } = usePlanStore();

  useEffect(() => {
    if (!user) return;
    void PlanService.loadGoals(user.id);
    void PlanService.loadProgram(user.id);
  }, [user?.id]);

  const days         = getDaysForOffset(weekOffset);
  const selectedDate = days[selectedIdx];
  const dayEntries   = weekPlan[selectedDate] ?? [];

  function goToPrevWeek() { setWeekOffset((o) => o - 1); }
  function goToNextWeek() { setWeekOffset((o) => o + 1); }
  function goToThisWeek() {
    setWeekOffset(0);
    const current = getDaysForOffset(0);
    setSelectedIdx(Math.max(0, current.indexOf(today)));
  }

  function applyTemplateToWeek() {
    days.forEach((dateStr, i) => {
      (template[i] ?? []).forEach((entry) => {
        const already = weekPlan[dateStr] ?? [];
        const exists  = already.some((e) => e.label === entry.label && e.type === entry.type);
        if (!exists) addPlanEntry(dateStr, entry);
      });
    });
  }

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
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">Esta semana</p>
          <div className="rounded-4xl bg-white shadow-card p-4 space-y-3">

            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={goToPrevWeek}
                className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors flex-shrink-0">
                <ChevronLeft size={16} />
              </button>

              <div className="text-center flex-1 mx-2">
                <button type="button" onClick={weekOffset !== 0 ? goToThisWeek : undefined}
                  className={`text-xs font-semibold transition-colors ${
                    weekOffset !== 0 ? 'text-moss hover:text-moss/70' : 'text-ink'
                  }`}>
                  {weekOffsetLabel(weekOffset)}
                </button>
              </div>

              <button type="button" onClick={goToNextWeek}
                className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors flex-shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day strip */}
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
              onRemove={(i) => removePlanEntry(selectedDate, i)}
            />
          </div>
        </div>

        {/* ── 2. Objetivos activos ──────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Objetivos activos</p>
            <button type="button" onClick={() => setShowAddGoal(true)}
              className="h-6 w-6 rounded-lg bg-canvas flex items-center justify-center text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors">
              <Plus size={13} />
            </button>
          </div>

          {goals.length === 0 ? (
            <button type="button" onClick={() => setShowAddGoal(true)}
              className="w-full rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center hover:bg-canvas transition-colors">
              <Target size={22} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin objetivos activos</p>
              <p className="text-xs text-ink/30 font-medium">Pulsa para añadir tu primer objetivo</p>
            </button>
          ) : (
            <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
              {goals.map((g, i) => (
                <div key={g.id}>
                  <GoalRow id={g.id} label={g.label} progressPct={g.progressPct}
                    onDelete={() => user && PlanService.deleteGoal(g.id)} />
                  {i < goals.length - 1 && <div className="h-px bg-ink/5 mt-4" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Programa activo ───────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">Programa activo</p>
          {program ? (
            <ProgramCard name={program.name} currentWeek={program.currentWeek} totalWeeks={program.totalWeeks} />
          ) : (
            <button type="button" onClick={() => setShowAddProgram(true)}
              className="w-full rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center hover:bg-canvas transition-colors">
              <Layers size={22} className="text-ink/20" />
              <p className="text-sm text-ink/40">Sin programa activo</p>
              <p className="text-xs text-ink/30 font-medium">Pulsa para crear tu programa de recuperación</p>
            </button>
          )}
        </div>

        {/* ── 4. Semana base ───────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Semana base</p>
            <button type="button" onClick={() => setShowEditTemplate(true)}
              className="text-xs font-medium text-ink/40 hover:text-ink transition-colors flex items-center gap-1">
              <Pencil size={11} />Editar
            </button>
          </div>
          <TemplateReadView onEdit={() => setShowEditTemplate(true)} />
        </div>

      </div>

      {/* ── Sheets ──────────────────────────────────────── */}
      <AddPlanEntrySheet
        isOpen={showAddEntry} dateStr={selectedDate}
        onClose={() => setShowAddEntry(false)} />

      <EditTemplateSheet
        isOpen={showEditTemplate}
        onClose={() => setShowEditTemplate(false)}
        onApply={applyTemplateToWeek} />

      {user && (
        <>
          <AddGoalSheet isOpen={showAddGoal} onClose={() => setShowAddGoal(false)} userId={user.id} />
          <AddProgramSheet isOpen={showAddProgram} onClose={() => setShowAddProgram(false)} userId={user.id} />
        </>
      )}
    </>
  );
}
