'use client';

import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Scale, Zap, Moon, Dumbbell,
  Sparkles, Plus, ChevronRight, Check,
  Footprints, Flame, TrendingDown, TrendingUp,
  Bike, Waves, HeartPulse, RefreshCw, SportShoe, Target, Clock,
} from 'lucide-react';
import { WeeklyCalendar }   from './weekly-calendar';
import { MonthlyCalendar }  from './monthly-calendar';
import { WeightSheet }      from './weight-sheet';
import { WeightScreen }     from './weight-screen';
import { SleepSheet }       from './sleep-sheet';
import { SuenoScreen }      from './sueno-screen';
import { DolorSheet }       from './dolor-sheet';
import { LesionesScreen }   from './lesiones-screen';
import { ActivityCard }     from './actividades-screen';
import { AddActivitySheet } from './add-activity-sheet';
import { useRecoveryStore } from '../stores/recovery-store';
import { usePlanStore }     from '../stores/plan-store';
import { RecoveryService }  from '../lib/services';
import { buildRuleBasedInsight } from '../lib/metrics';
import { formatShortDate, sameDay, todayIso } from '../lib/date';
import type { ActivityEntry, ActivityType, MuscleGroup } from '../stores/recovery-store';

const PLAN_ICONS: Record<ActivityType, React.ElementType> = {
  gym:      Dumbbell,
  bike:     Bike,
  run:      SportShoe,
  walk:     Footprints,
  swim:     Waves,
  mobility: RefreshCw,
  rehab:    HeartPulse,
  other:    Target,
};

const MUSCLE_LABELS: Record<string, string> = {
  pecho: 'Pecho', espalda: 'Espalda', biceps: 'Bíceps', triceps: 'Tríceps',
  hombro: 'Hombro', core: 'Core', pierna: 'Pierna', gluteo: 'Glúteo',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function fmtSleep(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

function fmtMins(v: number): string {
  if (v === 0) return '';
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// MOCK – sustituir por Apple Health
function getMockMovement(dateStr: string): { steps: number; kcal: number; stepsGoal: number; kcalGoal: number } {
  const seed  = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const steps = 3500 + ((seed * 2654435761) >>> 0) % 7501;
  return { steps, kcal: Math.round(steps * 0.04), stepsGoal: 10000, kcalGoal: 500 };
}

function daysSince(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(isoDate + 'T12:00:00').getTime()) / 86400000));
}

function sinceLabel(days: number): string {
  if (days < 7)   return `${days} día${days === 1 ? '' : 's'}`;
  if (days < 30)  return `${Math.floor(days / 7)} semana${Math.floor(days / 7) === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.floor(days / 30)} mes${Math.floor(days / 30) === 1 ? '' : 'es'}`;
  return `${Math.floor(days / 365)} año${Math.floor(days / 365) === 1 ? '' : 's'}`;
}

function calcDayScore(hasSleep: boolean, hasActivity: boolean, hasWeight: boolean, avgPain: number | null): number {
  let score = 25;
  if (hasSleep)    score += 20;
  if (hasActivity) score += 25;
  if (hasWeight)   score += 10;
  score += avgPain === null ? 10 : Math.round(Math.max(0, (10 - avgPain) / 10 * 20));
  return score;
}

// ── Reusable daily-log row ────────────────────────────────────────────────────

function DailyRow({
  icon: Icon,
  label,
  value,
  done,
  doneColor = 'text-moss',
  doneBg    = 'bg-moss',
  onAdd,
  onDetail,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  done: boolean;
  doneColor?: string;
  doneBg?: string;
  onAdd?: () => void;
  onDetail?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      {/* Circle = add/log button */}
      <button
        type="button"
        onClick={onAdd}
        className={`h-[22px] w-[22px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90 ${
          done ? doneBg : 'border-[1.5px] border-ink/15 active:border-ink/30'
        }`}
      >
        {done
          ? <Check size={11} strokeWidth={2.5} className="text-white" />
          : <Plus size={9} className="text-ink/30" />
        }
      </button>

      {/* Label + value */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-none transition-colors ${done ? 'text-ink' : 'text-ink/45'}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 leading-none ${value ? doneColor : 'text-ink/25'}`}>
          {value ?? 'Sin registrar'}
        </p>
      </div>

      {/* Arrow → detail screen */}
      {onDetail && (
        <button
          type="button"
          onClick={onDetail}
          className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
        >
          <ChevronRight size={14} className="text-ink/35" />
        </button>
      )}
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function TodayScreen({ onNavToActividades }: { onNavToActividades?: () => void } = {}) {
  const [showMonthly,        setShowMonthly]        = useState(false);
  const [showWeightSheet,    setShowWeightSheet]    = useState(false);
  const [showWeightScreen,   setShowWeightScreen]   = useState(false);
  const [showSleepSheet,     setShowSleepSheet]     = useState(false);
  const [showSuenoScreen,    setShowSuenoScreen]    = useState(false);
  const [showDolorSheet,     setShowDolorSheet]     = useState(false);
  const [showLesionesScreen, setShowLesionesScreen] = useState(false);
  const [showAddActivity,    setShowAddActivity]    = useState(false);
  const [editActivity,       setEditActivity]       = useState<ActivityEntry | undefined>(undefined);
  const [prefillActivity,    setPrefillActivity]    = useState<{ type: ActivityType; muscleGroups?: MuscleGroup[] } | undefined>(undefined);

  const {
    selectedDate, setSelectedDate,
    checkIns, weightEntries, activities, injuryLogs, injuries, sleepEntries,
  } = useRecoveryStore();

  const weekPlan   = usePlanStore((s) => s.weekPlan);
  const planEntries = weekPlan[selectedDate] ?? [];

  const today   = todayIso();
  const isToday = sameDay(selectedDate, today);

  // ── Day data ─────────────────────────────────────────────────────────────
  const dayCheckIn    = checkIns.find((c) => sameDay(c.date, selectedDate));
  const dayActivities = activities.filter((a) => sameDay(a.date, selectedDate));
  const dayLogs       = injuryLogs.filter((l) => sameDay(l.date, selectedDate));
  const todaySleep    = sleepEntries.find((s) => sameDay(s.date, selectedDate));
  const todayWeight   = weightEntries.find((w) => sameDay(w.date, selectedDate));
  const activeInjuries = injuries.filter((i) => i.status !== 'resolved');
  const hasRehab       = !!(dayCheckIn?.habits.rehab || dayLogs.some((l) => l.didRehab));

  // ── Row values ───────────────────────────────────────────────────────────
  const sleepValue = todaySleep
    ? `${fmtSleep(todaySleep.durationH)} · calidad ${todaySleep.quality}/5`
    : null;

  const totalActMins  = dayActivities.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
  const activityValue = dayActivities.length > 0
    ? [`${dayActivities.length} sesión${dayActivities.length > 1 ? 'es' : ''}`, totalActMins > 0 ? fmtMins(totalActMins) : null].filter(Boolean).join(' · ')
    : null;

  const weightValue = todayWeight ? `${todayWeight.weightKg.toFixed(1)} kg` : null;

  const avgPainToday = dayLogs.length > 0
    ? (dayLogs.reduce((s, l) => s + l.painLevel, 0) / dayLogs.length).toFixed(1)
    : null;
  const dolorRehabDone  = dayLogs.length > 0 || hasRehab;
  const dolorRehabValue = dolorRehabDone
    ? `${avgPainToday ?? '--'}/10 · ${hasRehab ? '✓' : '✗'}`
    : null;

  // ── Day score ────────────────────────────────────────────────────────────
  const dayScore = calcDayScore(
    !!todaySleep,
    dayActivities.length > 0,
    !!todayWeight,
    avgPainToday ? parseFloat(avgPainToday) : null,
  );
  const scoreConfig =
    dayScore >= 85 ? { label: 'Excelente',    color: 'text-moss' }
    : dayScore >= 65 ? { label: 'Buen estado',  color: 'text-moss' }
    : dayScore >= 45 ? { label: 'Progresando',  color: 'text-ember' }
    :                  { label: 'Día tranquilo', color: 'text-ink/40' };

  // MOCK – sustituir por Apple Health
  const mockMovement  = getMockMovement(selectedDate);
  const stepsPct      = Math.min(100, Math.round((mockMovement.steps / mockMovement.stepsGoal) * 100));
  const kcalPct       = Math.min(100, Math.round((mockMovement.kcal  / mockMovement.kcalGoal)  * 100));

  // ── Insight + labels ─────────────────────────────────────────────────────
  const insight = buildRuleBasedInsight({
    activeInjuries: injuries, injuryLogs, checkIns, weights: weightEntries,
  });

  const selDateObj = new Date(selectedDate + 'T12:00:00');
  const monthLabel = `${MONTH_NAMES[selDateObj.getMonth()]} ${selDateObj.getFullYear()}`;
  const dayLabel   = selDateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">

        {/* ── Weekly calendar ───────────────────────────────── */}
        <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink uppercase tracking-wide">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setShowMonthly(true)}
              className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Ver calendario mensual"
            >
              <CalendarIcon size={15} className="text-ink/50" />
            </button>
          </div>
          <WeeklyCalendar
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            checkIns={checkIns}
            weights={weightEntries}
            activities={activities}
            injuryLogs={injuryLogs}
          />
        </div>

        {/* ── Day header ────────────────────────────────────── */}
        <div>
          <p className="text-xs text-ink/40 font-medium uppercase tracking-wider">
            {isToday ? 'Hoy' : formatShortDate(selectedDate)}
          </p>
          <p className="text-lg font-bold text-ink leading-tight capitalize">{dayLabel}</p>
        </div>

        {/* ── Estado de hoy ─────────────────────────────────── */}
        <div className="rounded-4xl bg-white shadow-card px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Estado de hoy</p>
            <p className={`text-base font-bold mt-0.5 ${scoreConfig.color}`}>{scoreConfig.label}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold leading-none ${scoreConfig.color}`}>{dayScore}</p>
            <p className="text-[10px] text-ink/30 mt-0.5">/ 100</p>
          </div>
        </div>

        {/* ── Plan del día ──────────────────────────────────── */}
        {planEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Plan del día
            </p>
            <div className="rounded-4xl bg-white shadow-card overflow-hidden">
              {planEntries.map((entry, i) => {
                const Icon = PLAN_ICONS[entry.type] ?? Target;
                const isDone = activities.some(
                  (a) => sameDay(a.date, selectedDate) && (a as any).activityType === entry.type,
                );
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-5 py-4 ${
                      i < planEntries.length - 1 ? 'border-b border-ink/5' : ''
                    }`}
                  >
                    {/* Done indicator */}
                    <div className={`h-[22px] w-[22px] rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone ? 'bg-moss' : 'border-[1.5px] border-ink/15'
                    }`}>
                      {isDone
                        ? <Check size={11} strokeWidth={2.5} className="text-white" />
                        : <div className="w-1.5 h-1.5 rounded-full bg-ink/15" />
                      }
                    </div>

                    {/* Icon */}
                    <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className={isDone ? 'text-moss' : 'text-ink/40'} />
                    </div>

                    {/* Label + muscle chips */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${isDone ? 'text-ink/40 line-through' : 'text-ink'}`}>
                        {entry.label}
                      </p>
                      {entry.muscleGroups && entry.muscleGroups.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {entry.muscleGroups.map((m) => (
                            <span key={m} className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                              isDone ? 'text-ink/30 bg-ink/5' : 'text-moss bg-moss/10'
                            }`}>
                              {MUSCLE_LABELS[m] ?? m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    {entry.time && (
                      <div className="flex items-center gap-1 bg-canvas rounded-xl px-2.5 py-1.5 flex-shrink-0">
                        <Clock size={10} className="text-ink/30" />
                        <span className="text-[11px] font-semibold text-ink/50 tabular-nums">{entry.time}</span>
                      </div>
                    )}

                    {/* Log button */}
                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => {
                          if (entry.type === 'rehab') {
                            setShowDolorSheet(true);
                          } else {
                            setPrefillActivity({ type: entry.type, muscleGroups: entry.muscleGroups });
                            setShowAddActivity(true);
                          }
                        }}
                        className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center text-ink/30 hover:text-ink hover:bg-ink/5 transition-colors flex-shrink-0"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Registros del día ─────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Registros de hoy
          </p>
          <div className="rounded-4xl bg-white shadow-card px-5 py-1 divide-y divide-ink/5">
            <DailyRow
              icon={Moon}
              label="Sueño"
              value={sleepValue}
              done={!!todaySleep}
              doneColor="text-sand"
              doneBg="bg-[#a07848]"
              onAdd={() => setShowSleepSheet(true)}
              onDetail={() => setShowSuenoScreen(true)}
            />
            <DailyRow
              icon={Dumbbell}
              label="Actividad"
              value={activityValue}
              done={dayActivities.length > 0}
              doneColor="text-moss"
              doneBg="bg-moss"
              onAdd={() => setShowAddActivity(true)}
              onDetail={onNavToActividades}
            />
            <DailyRow
              icon={Scale}
              label="Peso"
              value={weightValue}
              done={!!todayWeight}
              doneColor="text-ember"
              doneBg="bg-ember"
              onAdd={() => setShowWeightSheet(true)}
              onDetail={() => setShowWeightScreen(true)}
            />
            {activeInjuries.length > 0 && (
              <DailyRow
                icon={Zap}
                label="Lesión"
                value={dolorRehabValue}
                done={dolorRehabDone}
                doneColor="text-red-400"
                doneBg="bg-red-400"
                onAdd={() => setShowDolorSheet(true)}
                onDetail={() => setShowLesionesScreen(true)}
              />
            )}
          </div>
        </div>

        {/* ── Movimiento de hoy (MOCK — sustituir por Apple Health) ── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Movimiento de hoy
          </p>
          <div className="rounded-4xl bg-white shadow-card px-5 py-4 space-y-4">
            {/* Pasos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Footprints size={13} className="text-ink/40" />
                  <span className="text-xs text-ink/50">Pasos</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-ink">{mockMovement.steps.toLocaleString('es-ES')}</span>
                  <span className="text-[10px] text-ink/30">/ {mockMovement.stepsGoal.toLocaleString('es-ES')}</span>
                </div>
              </div>
              <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                <div className="bg-moss h-1.5 rounded-full" style={{ width: `${stepsPct}%` }} />
              </div>
            </div>
            {/* Calorías */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame size={13} className="text-ember" />
                  <span className="text-xs text-ink/50">Calorías</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-ink">{mockMovement.kcal}</span>
                  <span className="text-[10px] text-ink/30">/ {mockMovement.kcalGoal} kcal</span>
                </div>
              </div>
              <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                <div className="bg-ember h-1.5 rounded-full" style={{ width: `${kcalPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Activities detail ─────────────────────────────── */}
        {dayActivities.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Actividades
            </p>
            <div className="space-y-3">
              {dayActivities.map((act) => (
                <ActivityCard
                  key={act.id}
                  act={act}
                  onEdit={(a) => { setEditActivity(a); setShowAddActivity(true); }}
                  onDelete={(id) => RecoveryService.deleteActivity(id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Active injury status ──────────────────────────── */}
        {activeInjuries.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Lesiones activas
            </p>
            {activeInjuries.map((injury) => {
              const logs   = injuryLogs.filter((l) => l.injuryId === injury.id);
              const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
              const avgPain = recent.length > 0
                ? Number((recent.reduce((s, l) => s + l.painLevel, 0) / recent.length).toFixed(1))
                : null;
              const painColor =
                avgPain === null ? 'text-ink/30'
                : avgPain <= 3  ? 'text-moss'
                : avgPain <= 6  ? 'text-ember'
                : 'text-red-500';

              // Week-over-week pain diff
              const weekMs   = 7 * 86400000;
              const nowMs    = Date.now();
              const thisWeek = logs.filter((l) => nowMs - new Date(l.date + 'T12:00:00').getTime() < weekMs);
              const lastWeek = logs.filter((l) => {
                const ms = nowMs - new Date(l.date + 'T12:00:00').getTime();
                return ms >= weekMs && ms < 2 * weekMs;
              });
              const thisAvg  = thisWeek.length ? thisWeek.reduce((s, l) => s + l.painLevel, 0) / thisWeek.length : null;
              const prevAvg  = lastWeek.length ? lastWeek.reduce((s, l) => s + l.painLevel, 0) / lastWeek.length : null;
              const painDiff = thisAvg !== null && prevAvg !== null ? +(thisAvg - prevAvg).toFixed(1) : null;

              // Trend fallback when no week-over-week data
              let trend: 'mejorando' | 'empeorando' | null = null;
              if (painDiff === null && recent.length >= 4) {
                const half  = Math.floor(recent.length / 2);
                const newer = recent.slice(0, half).reduce((s, l) => s + l.painLevel, 0) / half;
                const older = recent.slice(half).reduce((s, l) => s + l.painLevel, 0) / half;
                if (newer < older - 0.5)      trend = 'mejorando';
                else if (newer > older + 0.5) trend = 'empeorando';
              }

              const ageDays = daysSince(injury.startDate);

              return (
                <div key={injury.id} className="rounded-3xl bg-white shadow-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{injury.name}</p>
                      {injury.bodyPart && <p className="text-xs text-ink/40 capitalize mt-0.5">{injury.bodyPart}</p>}
                      <p className="text-[10px] text-ink/30 mt-1.5">Activa desde hace {sinceLabel(ageDays)}</p>
                      {painDiff !== null ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          {painDiff < 0
                            ? <TrendingDown size={10} className="text-moss flex-shrink-0" />
                            : <TrendingUp   size={10} className="text-ember flex-shrink-0" />
                          }
                          <p className={`text-[10px] font-medium ${painDiff < 0 ? 'text-moss' : 'text-ember'}`}>
                            {painDiff < 0
                              ? `↓ ${Math.abs(painDiff)} pts vs sem. pasada`
                              : `↑ +${painDiff} pts vs sem. pasada`
                            }
                          </p>
                        </div>
                      ) : trend ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          {trend === 'mejorando'
                            ? <TrendingDown size={10} className="text-moss flex-shrink-0" />
                            : <TrendingUp   size={10} className="text-ember flex-shrink-0" />
                          }
                          <p className={`text-[10px] font-medium ${trend === 'mejorando' ? 'text-moss' : 'text-ember'}`}>
                            {trend === 'mejorando' ? '↓ Mejorando esta semana' : '↑ Empeorando'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-2xl font-bold leading-none ${painColor}`}>
                        {avgPain ?? '--'}<span className="text-xs font-normal text-ink/30">/10</span>
                      </p>
                      <p className="text-[10px] text-ink/30 mt-0.5">dolor medio</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Insight ───────────────────────────────────────── */}
        <div className="rounded-4xl bg-ink p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Insight</p>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
        </div>
      </div>

      {/* ── Sheets ───────────────────────────────────────────── */}
      <MonthlyCalendar
        isOpen={showMonthly}
        onClose={() => setShowMonthly(false)}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        checkIns={checkIns}
        weights={weightEntries}
        activities={activities}
        injuryLogs={injuryLogs}
      />
      <AddActivitySheet
        isOpen={showAddActivity}
        onClose={() => { setShowAddActivity(false); setEditActivity(undefined); setPrefillActivity(undefined); }}
        editActivity={editActivity}
        prefill={prefillActivity}
      />
      <WeightSheet
        isOpen={showWeightSheet}
        onClose={() => setShowWeightSheet(false)}
        defaultDate={selectedDate}
        defaultKg={todayWeight?.weightKg}
        editId={todayWeight?.id}
      />
      <SleepSheet
        isOpen={showSleepSheet}
        onClose={() => setShowSleepSheet(false)}
        defaultDate={selectedDate}
        defaultDurationH={todaySleep?.durationH}
        defaultQuality={todaySleep?.quality}
        editId={todaySleep?.id}
      />
      <DolorSheet
        isOpen={showDolorSheet}
        onClose={() => setShowDolorSheet(false)}
        defaultDate={selectedDate}
      />
      {showWeightScreen   && <WeightScreen    onClose={() => setShowWeightScreen(false)} />}
      {showSuenoScreen    && <SuenoScreen     onClose={() => setShowSuenoScreen(false)} />}
      {showLesionesScreen && <LesionesScreen  onClose={() => setShowLesionesScreen(false)} />}
    </>
  );
}
