'use client';

import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Scale,
  Sparkles, Check,
  Footprints, Flame,
  UtensilsCrossed, HeartPulse, Heart, Gauge,
} from 'lucide-react';
import { WeeklyCalendar }   from './weekly-calendar';
import { MonthlyCalendar }  from './monthly-calendar';
import { WeightSheet }      from './weight-sheet';
import { SleepSheet }       from './sleep-sheet';
import { MovementSheet }    from './movement-sheet';
import { DolorSheet }       from './dolor-sheet';
import { ActivityCard, ActivityDetailSheet } from './actividades-screen';
import { AddActivitySheet } from './add-activity-sheet';
import { DayScoreCard } from './day-score-card';
import { PasosDetailSheet } from './pasos-detail-sheet';
import { AlimentacionDetailSheet } from './alimentacion-detail-sheet';
import { AddMealSheet }     from './add-meal-sheet';
import { useRecoveryStore } from '../stores/recovery-store';
import { usePlanStore }     from '../stores/plan-store';
import { useNutritionStore } from '../stores/nutrition-store';
import { useSessionStore }  from '../stores/session-store';
import { RecoveryService, NutritionService } from '../lib/services';
import { PlanService } from '../lib/plan-service';
import { buildRuleBasedInsight } from '../lib/metrics';
import { formatShortDate, sameDay, todayIso } from '../lib/date';
import { ACTIVE_CALORIES_GOAL, getMovementPercent, pickBySourcePrecedence, STEPS_GOAL } from '../lib/health-metrics';
import { calculateBmr } from '../lib/bmr';
import type { ActivityEntry, ActivityType, MuscleGroup } from '../stores/recovery-store';
import type { ActivityPlanEntry, TaskPlanEntry } from '../stores/plan-store';

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

function formatActivitySummary(activity: ActivityEntry): string {
  const parts: string[] = [];

  if ((activity.type === 'run' || activity.type === 'walk' || activity.type === 'bike') && activity.distanceKm) {
    parts.push(`${activity.distanceKm.toFixed(1)} km`);
  }

  if (activity.durationMinutes && activity.durationMinutes > 0) {
    parts.push(fmtMins(activity.durationMinutes));
  }

  if (activity.type === 'gym' && activity.muscleGroups && activity.muscleGroups.length > 0) {
    parts.push(activity.muscleGroups.map((group) => MUSCLE_LABELS[group] ?? group).join(' · '));
  }

  return parts.join(' · ');
}

function matchesPlanEntry(entry: ActivityPlanEntry, activity: ActivityEntry): boolean {
  return activity.type === entry.type;
}

function getPlannedActivityMatches(entries: ActivityPlanEntry[], activities: ActivityEntry[]) {
  const usedIds = new Set<string>();

  return entries.map((entry) => {
    // Rehab entries never match a logged Activity — completion comes from today's
    // InjuryLog.didRehab (see hasRehab), not from the Activities list.
    const matchedActivity = entry.type === 'rehab' ? null : activities.find((activity) => {
      if (usedIds.has(activity.id)) return false;
      return matchesPlanEntry(entry, activity);
    }) ?? null;

    if (matchedActivity) usedIds.add(matchedActivity.id);

    return { entry, matchedActivity };
  });
}

// MOCK – sustituir por Apple Health
function getMockMovement(dateStr: string): { steps: number; kcal: number; stepsGoal: number; kcalGoal: number } {
  const seed  = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const steps = 3500 + ((seed * 2654435761) >>> 0) % 7501;
  return { steps, kcal: Math.round(steps * 0.04), stepsGoal: 10000, kcalGoal: 500 };
}

function computePainTrend(logs: Array<{ date: string; painLevel: number }>): {
  avgPain: number | null;
  painDiff: number | null;
  trend: 'mejorando' | 'empeorando' | null;
} {
  const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const avgPain = recent.length > 0
    ? Number((recent.reduce((s, l) => s + l.painLevel, 0) / recent.length).toFixed(1))
    : null;

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

  let trend: 'mejorando' | 'empeorando' | null = null;
  if (painDiff !== null) {
    trend = painDiff < 0 ? 'mejorando' : painDiff > 0 ? 'empeorando' : null;
  } else if (recent.length >= 4) {
    const half  = Math.floor(recent.length / 2);
    const newer = recent.slice(0, half).reduce((s, l) => s + l.painLevel, 0) / half;
    const older = recent.slice(half).reduce((s, l) => s + l.painLevel, 0) / half;
    if (newer < older - 0.5)      trend = 'mejorando';
    else if (newer > older + 0.5) trend = 'empeorando';
  }

  return { avgPain, painDiff, trend };
}

// ── Reusable daily-log row ────────────────────────────────────────────────────

// ── Screen ───────────────────────────────────────────────────────────────────

export function TodayScreen({ onNavToProgreso }: { onNavToActividades?: () => void; onNavToProgreso?: () => void } = {}) {
  const [showMonthly,        setShowMonthly]        = useState(false);
  const [showWeightSheet,    setShowWeightSheet]    = useState(false);
  const [showSleepSheet,     setShowSleepSheet]     = useState(false);
  const [showMovementSheet,  setShowMovementSheet]  = useState(false);
  const [showPasosSheet,     setShowPasosSheet]     = useState(false);
  const [showDolorSheet,     setShowDolorSheet]     = useState(false);
  const [showAddActivity,    setShowAddActivity]    = useState(false);
  const [showAddMeal,        setShowAddMeal]        = useState(false);
  const [showAlimentacionSheet, setShowAlimentacionSheet] = useState(false);
  const [editActivity,       setEditActivity]       = useState<ActivityEntry | undefined>(undefined);
  const [detailActivity,     setDetailActivity]     = useState<ActivityEntry | null>(null);
  const [prefillActivity,    setPrefillActivity]    = useState<{ type: ActivityType; muscleGroups?: MuscleGroup[] } | undefined>(undefined);

  const {
    selectedDate, setSelectedDate,
    checkIns, weightEntries, activities, injuryLogs, injuries, sleepEntries, dailyHealthMetrics,
  } = useRecoveryStore();

  const userId          = useSessionStore((s) => s.user?.id);
  const nutritionByDate = useNutritionStore((s) => s.summaryByDate);
  const dailyNutrition  = nutritionByDate[selectedDate] ?? null;
  const nutritionGoal   = useNutritionStore((s) => s.goal);

  useEffect(() => {
    if (!userId || nutritionByDate[selectedDate]) return;
    NutritionService.fetchDailySummary(userId, selectedDate).catch(() => {});
  }, [selectedDate, userId]);

  const weekPlan   = usePlanStore((s) => s.weekPlan);
  const activeProgram = usePlanStore((s) => s.program);
  const planEntries = weekPlan[selectedDate] ?? [];
  const activityPlanEntries = planEntries.filter((e): e is ActivityPlanEntry => e.kind !== 'task');
  const taskRows = planEntries
    .map((entry, index) => ({ entry, index }))
    .filter((row): row is { entry: TaskPlanEntry; index: number } => row.entry.kind === 'task');

  const today   = todayIso();
  const isToday = sameDay(selectedDate, today);

  // ── Day data ─────────────────────────────────────────────────────────────
  const dayCheckIn    = checkIns.find((c) => sameDay(c.date, selectedDate));
  const dayActivities = activities.filter((a) => sameDay(a.date, selectedDate));
  const dayLogs       = injuryLogs.filter((l) => sameDay(l.date, selectedDate));
  const todaySleep    = pickBySourcePrecedence(sleepEntries, selectedDate);
  const todayWeight   = weightEntries.find((w) => sameDay(w.date, selectedDate));
  const todayMovement = pickBySourcePrecedence(dailyHealthMetrics, selectedDate);
  const activeInjuries = injuries.filter((i) => i.status !== 'resolved');
  const phaseInjury = activeInjuries.find((i) => i.phaseLabel);
  const phaseCompletedSessions = phaseInjury
    ? injuryLogs.filter((l) => l.injuryId === phaseInjury.id && l.didRehab && (!phaseInjury.phaseStartDate || l.date >= phaseInjury.phaseStartDate)).length
    : 0;
  const phaseInjuryPainTrend = phaseInjury
    ? computePainTrend(injuryLogs.filter((l) => l.injuryId === phaseInjury.id))
    : null;
  const hasRehab       = !!(dayCheckIn?.habits.rehab || dayLogs.some((l) => l.didRehab));

  const painQualifier = phaseInjuryPainTrend?.trend === 'mejorando' ? ', con el dolor mejorando'
    : phaseInjuryPainTrend?.trend === 'empeorando' ? ', con el dolor empeorando'
    : phaseInjuryPainTrend?.avgPain != null ? ', con el dolor estable'
    : '';
  const phaseTipText = !phaseInjury ? ''
    : phaseInjury.phaseTargetSessions == null ? 'Sin objetivo de sesiones definido.'
    : phaseCompletedSessions >= phaseInjury.phaseTargetSessions ? 'Fase completada.'
    : `Te quedan ${phaseInjury.phaseTargetSessions - phaseCompletedSessions} sesion${phaseInjury.phaseTargetSessions - phaseCompletedSessions === 1 ? '' : 'es'} para completar la fase${painQualifier}.`;

  const hasRecoveryData =
    todayMovement?.source === 'coros' &&
    (todayMovement.hrv != null || todayMovement.restingHeartRate != null || todayMovement.stressAvg != null);

  const plannedActivityRows = getPlannedActivityMatches(activityPlanEntries, dayActivities);
  const rehabPlanEntry = activityPlanEntries.find((e) => e.type === 'rehab');
  const pendingCount =
    plannedActivityRows.filter(({ entry, matchedActivity }) => !(entry.type === 'rehab' ? hasRehab : !!matchedActivity)).length +
    taskRows.filter(({ entry }) => !entry.completed).length;

  // MOCK – sustituir por Apple Health
  const movementSteps = todayMovement?.steps ?? 0;
  const movementActiveCalories = todayMovement?.activeCalories ?? 0;
  const { stepsPct, activeCaloriesPct } = getMovementPercent(movementSteps, movementActiveCalories);
  const latestWeight = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const basalCalories = calculateBmr({
    sex: nutritionGoal?.sex,
    heightCm: nutritionGoal?.heightCm,
    age: nutritionGoal?.age,
    weightKg: latestWeight?.weightKg,
  });
  const totalCaloriesOut = movementActiveCalories + (basalCalories ?? 0);
  const nutritionBalance = dailyNutrition ? dailyNutrition.totalCalories - totalCaloriesOut : 0;

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
            healthMetrics={dailyHealthMetrics}
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
        <DayScoreCard
          selectedDate={selectedDate}
          onNavToProgreso={onNavToProgreso}
          hasActiveInjuries={activeInjuries.length > 0}
          todayWeightKg={todayWeight?.weightKg ?? null}
          onAddSleep={() => setShowSleepSheet(true)}
          onAddWeight={() => setShowWeightSheet(true)}
          onAddPain={() => setShowDolorSheet(true)}
        />

        {/* ── Movimiento de hoy ─────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Movimiento hoy
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Pasos — tap abre historial */}
            <button type="button" onClick={() => setShowPasosSheet(true)} className="space-y-1.5 text-left">
              <div className="flex items-baseline gap-1">
                <Footprints size={13} className="text-ink/40 flex-shrink-0 self-center" />
                <span className="text-lg font-bold text-ink">{movementSteps.toLocaleString('es-ES')}</span>
                <span className="text-xs text-ink/40">pasos</span>
              </div>
              <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                <div className="bg-moss h-1.5 rounded-full" style={{ width: `${stepsPct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ink/30">de {STEPS_GOAL.toLocaleString('es-ES')}</span>
                <span className="text-[10px] text-ink/30">{stepsPct}%</span>
              </div>
            </button>
            {/* Calorías */}
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-1">
                <Flame size={13} className="text-ember flex-shrink-0 self-center" />
                <span className="text-lg font-bold text-ink">{movementActiveCalories}</span>
                <span className="text-xs text-ink/40">kcal activas</span>
              </div>
              <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                <div className="bg-moss h-1.5 rounded-full" style={{ width: `${activeCaloriesPct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ink/30">de {ACTIVE_CALORIES_GOAL}</span>
                <span className="text-[10px] text-ink/30">{activeCaloriesPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Alimentación ──────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Alimentación hoy
          </p>
          <button
            type="button"
            onClick={() => setShowAlimentacionSheet(true)}
            disabled={!dailyNutrition}
            className="w-full text-left disabled:cursor-default"
          >
            {dailyNutrition ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-1">
                    <UtensilsCrossed size={13} className="text-ink/40 flex-shrink-0 self-center" />
                    <span className="text-lg font-bold text-ink">{dailyNutrition.totalCalories.toLocaleString('es-ES')}</span>
                    <span className="text-xs text-ink/40">kcal</span>
                  </div>
                  <div className="w-full bg-ink/[0.08] rounded-full h-1.5">
                    <div className="bg-moss h-1.5 rounded-full" style={{ width: `${Math.min(dailyNutrition.caloriesProgressPercent, 100)}%` }} />
                  </div>
                  <p className="text-xs text-ink/50">Consumidas</p>
                  <p className="text-[10px] text-ink/30">de {dailyNutrition.caloriesTarget.toLocaleString('es-ES')} objetivo</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-1">
                    <Scale size={13} className="text-ink/40 flex-shrink-0 self-center" />
                    <span className={`text-lg font-bold ${nutritionBalance >= 0 ? 'text-ember' : 'text-moss'}`}>
                      {nutritionBalance >= 0 ? '+' : ''}{nutritionBalance}
                    </span>
                    <span className="text-xs text-ink/40">kcal</span>
                  </div>
                  <p className="text-xs text-ink/50">Equilibrio</p>
                  <p className="text-[10px] text-ink/30">{totalCaloriesOut.toLocaleString('es-ES')} kcal gastadas</p>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="text-sm text-ink/30">Sin registros hoy</p>
                <p className="text-xs text-ink/20 mt-0.5">Añade tu primera comida</p>
              </div>
            )}
          </button>
        </div>

        {/* ── Activities detail ─────────────────────────────── */}
        {dayActivities.length > 0 && planEntries.length === 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Actividades
            </p>
            <div className="space-y-3">
              {dayActivities.map((act) => (
                <ActivityCard
                  key={act.id}
                  act={act}
                  onTap={setDetailActivity}
                  onEdit={(a) => { setEditActivity(a); setShowAddActivity(true); }}
                  onDelete={(id) => RecoveryService.deleteActivity(id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Recuperación (COROS) ──────────────────────────── */}
        {hasRecoveryData && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Recuperación
            </p>
            <div className="rounded-4xl bg-white shadow-card px-5 py-4 flex items-center justify-between gap-2">
              {todayMovement?.hrv != null && (
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center">
                    <HeartPulse size={15} className="text-moss" />
                  </div>
                  <p className="text-base font-bold text-ink leading-none">{todayMovement.hrv}</p>
                  <p className="text-[10px] text-ink/40 leading-none">HRV (ms)</p>
                </div>
              )}
              {todayMovement?.restingHeartRate != null && (
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center">
                    <Heart size={15} className="text-ember" />
                  </div>
                  <p className="text-base font-bold text-ink leading-none">{todayMovement.restingHeartRate}</p>
                  <p className="text-[10px] text-ink/40 leading-none">FC reposo</p>
                </div>
              )}
              {todayMovement?.stressAvg != null && (
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center">
                    <Gauge size={15} className="text-ink/50" />
                  </div>
                  <p className="text-base font-bold text-ink leading-none">{todayMovement.stressAvg}</p>
                  <p className="text-[10px] text-ink/40 leading-none">Estrés</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tu día ────────────────────────────────────────── */}
        {(plannedActivityRows.length > 0 || taskRows.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">
                Tu día
              </p>
              {pendingCount > 0 && (
                <span className="text-xs text-ink/30">{pendingCount} pendiente{pendingCount === 1 ? '' : 's'}</span>
              )}
            </div>
            <div className="border-t border-ink/5" />
            <div>
              {plannedActivityRows.map(({ entry, matchedActivity }, index) => {
                const isDone = entry.type === 'rehab' ? hasRehab : !!matchedActivity;
                const isPriority = entry.type === 'rehab' && !!phaseInjury;
                const isAuto = matchedActivity?.stravaId != null;
                const summary = matchedActivity ? formatActivitySummary(matchedActivity) : null;
                const muscleGroupsText = entry.muscleGroups?.map((g) => MUSCLE_LABELS[g] ?? g).join(' · ');
                const detailLine = isDone
                  ? [summary, 'hecho'].filter(Boolean).join(' · ')
                  : (entry.subtitle || muscleGroupsText || 'Sin hora fijada');

                return (
                  <button
                    key={`activity-${entry.type}-${entry.label}-${index}`}
                    type="button"
                    onClick={() => {
                      if (matchedActivity) { setDetailActivity(matchedActivity); return; }
                      if (entry.type === 'rehab') { setShowDolorSheet(true); return; }
                      setEditActivity(undefined);
                      setDetailActivity(null);
                      setPrefillActivity({ type: entry.type, muscleGroups: entry.muscleGroups });
                      setShowAddActivity(true);
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 text-left rounded-3xl transition-all ${
                      isPriority ? 'bg-white shadow-card my-1' : 'border-b border-ink/5 last:border-b-0'
                    }`}
                  >
                    <div className={`h-[22px] w-[22px] mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-moss' : 'border-[1.5px] border-ink/15'
                    }`}>
                      {isDone && <Check size={11} strokeWidth={2.5} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.time && <p className="text-xs text-ink/40 leading-none mb-1">{entry.time}</p>}
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-semibold leading-snug ${isDone ? 'text-ink' : 'text-ink/70'}`}>
                          {entry.label}
                        </p>
                        {isPriority && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-ink/50 bg-canvas rounded-full px-1.5 py-0.5 flex-shrink-0">
                            Prioridad
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink/40 mt-0.5">{detailLine}</p>
                    </div>
                    {isAuto && <span className="text-[10px] text-ink/25 flex-shrink-0 mt-0.5">auto</span>}
                  </button>
                );
              })}

              {taskRows.map(({ entry, index }) => (
                <button
                  key={`task-${entry.id}`}
                  type="button"
                  onClick={() => PlanService.updatePlanEntry(selectedDate, index, { ...entry, completed: !entry.completed })}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left rounded-3xl border-b border-ink/5 last:border-b-0"
                >
                  <div className={`h-[22px] w-[22px] mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.completed ? 'bg-moss' : 'border-[1.5px] border-ink/15'
                  }`}>
                    {entry.completed && <Check size={11} strokeWidth={2.5} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {entry.time && <p className="text-xs text-ink/40 leading-none mb-1">{entry.time}</p>}
                    <p className={`text-sm font-semibold leading-snug ${entry.completed ? 'text-ink' : 'text-ink/70'}`}>
                      {entry.label}
                    </p>
                    <p className="text-xs text-ink/40 mt-0.5">{entry.subtitle || 'Sin hora fijada'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Lo que importa esta semana ───────────────────── */}
        {phaseInjury && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Lo que importa esta semana
            </p>
            <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-ink">{phaseInjury.name} · {phaseInjury.phaseLabel}</p>
                  {activeProgram && (
                    <p className="text-xs text-ink/40 mt-0.5">
                      Semana {activeProgram.currentWeek} de {activeProgram.totalWeeks}
                    </p>
                  )}
                </div>
                {phaseInjury.phaseTargetSessions != null && (
                  <p className="text-sm font-semibold text-ink/50">
                    {phaseCompletedSessions}/{phaseInjury.phaseTargetSessions}
                  </p>
                )}
              </div>
              {phaseInjury.phaseTargetSessions != null && (
                <div className="flex gap-1">
                  {Array.from({ length: phaseInjury.phaseTargetSessions }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full ${i < phaseCompletedSessions ? 'bg-moss' : 'bg-ember/30'}`}
                    />
                  ))}
                </div>
              )}
              {rehabPlanEntry && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink/50">
                    Próxima: {rehabPlanEntry.label}{rehabPlanEntry.time ? ` · hoy ${rehabPlanEntry.time}` : ''}
                  </span>
                  {phaseInjury.phaseTargetSessions != null && (
                    <span className="text-ink/50 font-semibold">
                      {Math.round((phaseCompletedSessions / phaseInjury.phaseTargetSessions) * 100)}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-ink/40">{phaseTipText}</p>
            </div>
          </div>
        )}

        {/* ── Lo que he visto ───────────────────────────────── */}
        <div className="rounded-4xl bg-ink p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Lo que he visto</p>
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
        healthMetrics={dailyHealthMetrics}
      />
      <AddActivitySheet
        isOpen={showAddActivity}
        onClose={() => { setShowAddActivity(false); setEditActivity(undefined); setPrefillActivity(undefined); }}
        editActivity={editActivity}
        prefill={prefillActivity}
      />
      <ActivityDetailSheet
        act={detailActivity}
        onClose={() => setDetailActivity(null)}
        onEdit={(a) => { setDetailActivity(null); setEditActivity(a); setShowAddActivity(true); }}
        onDelete={(id) => { setDetailActivity(null); RecoveryService.deleteActivity(id); }}
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
        defaultScore={todaySleep?.score}
        editId={todaySleep?.id}
      />
      <MovementSheet
        isOpen={showMovementSheet}
        onClose={() => setShowMovementSheet(false)}
        defaultDate={selectedDate}
        defaultSteps={todayMovement?.steps}
        defaultActiveCalories={todayMovement?.activeCalories}
        editId={todayMovement?.id}
      />
      <PasosDetailSheet
        isOpen={showPasosSheet}
        onClose={() => setShowPasosSheet(false)}
        onEdit={() => { setShowPasosSheet(false); setShowMovementSheet(true); }}
        healthMetrics={dailyHealthMetrics}
        selectedDate={selectedDate}
        onNavToProgreso={onNavToProgreso}
      />
      {dailyNutrition && (
        <AlimentacionDetailSheet
          isOpen={showAlimentacionSheet}
          onClose={() => setShowAlimentacionSheet(false)}
          onAddMeal={() => { setShowAlimentacionSheet(false); setShowAddMeal(true); }}
          dailyNutrition={dailyNutrition}
          activeCalories={movementActiveCalories}
          basalCalories={basalCalories}
          selectedDate={selectedDate}
        />
      )}
      <DolorSheet
        isOpen={showDolorSheet}
        onClose={() => setShowDolorSheet(false)}
        defaultDate={selectedDate}
      />
      <AddMealSheet
        isOpen={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        defaultDate={selectedDate}
        onSaved={() => {
          const uid = useSessionStore.getState().user?.id;
          if (uid) NutritionService.fetchDailySummary(uid, selectedDate).catch(() => {});
        }}
      />
    </>
  );
}
