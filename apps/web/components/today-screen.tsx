'use client';

import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft, ChevronRight,
  Check, Plus, RefreshCw,
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
import { TodayQuickLog, type QuickLogItem } from './today-quick-log';
import { TodayMovementCard } from './today-movement-card';
import { TodayNutritionCard } from './today-nutrition-card';
import { TodayRecoveryCard, computeRecoveryBaseline } from './today-recovery-card';
import { TodayInsightCard } from './today-insight-card';
import { useRecoveryStore } from '../stores/recovery-store';
import { usePlanStore }     from '../stores/plan-store';
import { useNutritionStore } from '../stores/nutrition-store';
import { useSessionStore }  from '../stores/session-store';
import { RecoveryService, NutritionService, CorosService } from '../lib/services';
import type { CorosSyncInfo } from '../lib/services';
import { PlanService } from '../lib/plan-service';
import { buildRuleBasedInsight } from '../lib/metrics';
import { addDays, formatShortDate, sameDay, todayIso } from '../lib/date';
import { ACTIVE_CALORIES_GOAL, pickBySourcePrecedence, STEPS_GOAL } from '../lib/health-metrics';
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

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function greeting(name?: string): string {
  const hour = new Date().getHours();
  const base = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${base}, ${first}` : base;
}

function minutesAgoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.floor(hours / 24)} d`;
}


// ── Screen ───────────────────────────────────────────────────────────────────

export function TodayScreen({
  onNavToProgreso, onNavToPlan, onAskAgent,
}: {
  onNavToActividades?: () => void;
  onNavToProgreso?: () => void;
  onNavToPlan?: () => void;
  onAskAgent?: (prompt: string) => void;
} = {}) {
  const [showMonthly,        setShowMonthly]        = useState(false);
  const [showWeightSheet,    setShowWeightSheet]    = useState(false);
  const [showSleepSheet,     setShowSleepSheet]     = useState(false);
  const [showMovementSheet,  setShowMovementSheet]  = useState(false);
  const [showPasosSheet,     setShowPasosSheet]     = useState(false);
  const [showKcalSheet,      setShowKcalSheet]      = useState(false);
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

  const profileName = useRecoveryStore((s) => s.profile.name);
  const [syncInfo, setSyncInfo]   = useState<CorosSyncInfo | null>(null);
  const [syncing, setSyncing]     = useState(false);

  // The plan lives in the Plan tab's loaders; without this, "Tu día" is empty until that tab is opened.
  useEffect(() => {
    if (!userId) return;
    void PlanService.loadWeekPlan(userId);
    void PlanService.loadProgram(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void CorosService.getStatus(userId).then(setSyncInfo);
  }, [userId, selectedDate]);

  async function refreshNow() {
    if (!userId || syncing) return;
    setSyncing(true);
    try {
      const info = await CorosService.syncNow(userId, selectedDate);
      if (info) setSyncInfo(info);
    } finally {
      setSyncing(false);
    }
  }

  const weekPlan   = usePlanStore((s) => s.weekPlan);
  const activeProgram = usePlanStore((s) => s.program);
  const planEntries = weekPlan[selectedDate] ?? [];
  const activityPlanEntries = planEntries.filter((e): e is ActivityPlanEntry => e.kind !== 'task');
  const taskRows = planEntries
    .map((entry, index) => ({ entry, index }))
    .filter((row): row is { entry: TaskPlanEntry; index: number } => row.entry.kind === 'task');

  const today    = todayIso();
  const isToday  = sameDay(selectedDate, today);
  const isFuture = selectedDate > today;
  const isPast   = selectedDate < today;

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

  const movementSteps = todayMovement?.steps ?? 0;
  const movementActiveCalories = todayMovement?.activeCalories ?? 0;
  const latestWeight = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const basalCalories = calculateBmr({
    sex: nutritionGoal?.sex,
    heightCm: nutritionGoal?.heightCm,
    age: nutritionGoal?.age,
    weightKg: latestWeight?.weightKg,
  });
  const totalCaloriesOut = movementActiveCalories + (basalCalories ?? 0);

  // Activities that did not match a planned session (or all of them when there is no plan)
  const matchedIds = new Set(plannedActivityRows.map((r) => r.matchedActivity?.id).filter(Boolean) as string[]);
  const extraActivities = dayActivities.filter((a) => !matchedIds.has(a.id));

  const previousDays = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, -(i + 1)));
  const sleepAvgH = (() => {
    const values = previousDays
      .map((d) => pickBySourcePrecedence(sleepEntries, d)?.durationH)
      .filter((v): v is number => v != null);
    return values.length >= 3 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  })();
  const recoveryBaseline = computeRecoveryBaseline(dailyHealthMetrics, selectedDate, previousDays);
  // Only sessions (not checklist tasks) feed the "Hoy toca" line of the day state.
  const pendingSessionLabels = plannedActivityRows
    .filter(({ entry, matchedActivity }) => !(entry.type === 'rehab' ? hasRehab : !!matchedActivity))
    .map(({ entry }) => entry.label);

  const quickLog: QuickLogItem[] = [
    { key: 'peso',   label: 'Peso',   onClick: () => setShowWeightSheet(true), missing: !todayWeight },
    { key: 'sueno',  label: 'Sueño',  onClick: () => setShowSleepSheet(true),  missing: !todaySleep },
    ...(activeInjuries.length > 0
      ? [{ key: 'dolor', label: 'Dolor', onClick: () => setShowDolorSheet(true), missing: dayLogs.length === 0 }]
      : []),
    { key: 'comida', label: 'Comida', onClick: () => setShowAddMeal(true), missing: !dailyNutrition || dailyNutrition.totalCalories === 0 },
    { key: 'actividad', label: 'Actividad', onClick: () => { setEditActivity(undefined); setPrefillActivity(undefined); setShowAddActivity(true); }, missing: false },
  ].sort((a, b) => Number(b.missing) - Number(a.missing));
  const hasMissing = quickLog.some((item) => item.missing);

  // ── Insight + labels ─────────────────────────────────────────────────────
  const insight = buildRuleBasedInsight({
    activeInjuries: injuries, injuryLogs, checkIns, weights: weightEntries,
  });

  const selDateObj = new Date(selectedDate + 'T12:00:00');
  const monthLabel = `${MONTH_NAMES[selDateObj.getMonth()]} ${selDateObj.getFullYear()}`;
  const dayLabel   = capitalizeFirst(selDateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
  const dayCaption = isToday ? greeting(profileName) : isFuture ? 'Día planificado' : 'Resumen del día';
  const syncLabel  = isToday && syncInfo?.connected ? minutesAgoLabel(syncInfo.lastSyncAt) : null;

  return (
    <>
      <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">

        {/* ── Weekly calendar ───────────────────────────────── */}
        <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-bold text-ink uppercase tracking-wide">{monthLabel}</p>
            <div className="flex items-center gap-1.5">
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  className="h-8 rounded-xl bg-ink px-3 text-xs font-semibold text-white active:scale-95 transition-transform"
                >
                  Hoy
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Semana anterior"
              >
                <ChevronLeft size={16} className="text-ink/60" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Semana siguiente"
              >
                <ChevronRight size={16} className="text-ink/60" />
              </button>
              <button
                type="button"
                onClick={() => setShowMonthly(true)}
                className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Ver calendario mensual"
              >
                <CalendarIcon size={15} className="text-ink/60" />
              </button>
            </div>
          </div>
          <WeeklyCalendar
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onShiftWeek={(direction) => setSelectedDate(addDays(selectedDate, direction * 7))}
            checkIns={checkIns}
            weights={weightEntries}
            activities={activities}
            injuryLogs={injuryLogs}
            healthMetrics={dailyHealthMetrics}
            plan={weekPlan}
          />
        </div>

        {/* ── Day header ────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-ink/60 font-medium">{dayCaption}</p>
            <p className="text-lg font-bold text-ink leading-tight whitespace-nowrap">{dayLabel}</p>
          </div>
          {syncLabel && (
            <button
              type="button"
              onClick={refreshNow}
              disabled={syncing}
              className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1.5 text-[11px] text-ink/60 shadow-card active:scale-95 transition-transform"
              aria-label="Sincronizar COROS ahora"
            >
              <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando…' : syncLabel}
            </button>
          )}
        </div>

        {/* ── Estado del día ────────────────────────────────── */}
        {!isFuture && (
          <DayScoreCard
            selectedDate={selectedDate}
            onNavToProgreso={onNavToProgreso}
            hasActiveInjuries={activeInjuries.length > 0}
            todayWeightKg={todayWeight?.weightKg ?? null}
            onAddSleep={() => setShowSleepSheet(true)}
            onAddWeight={() => setShowWeightSheet(true)}
            onAddPain={() => setShowDolorSheet(true)}
            isToday={isToday}
            sleepAvgH={sleepAvgH}
            plannedToday={isToday ? pendingSessionLabels : []}
          />
        )}

        {/* ── Registro rápido ───────────────────────────────── */}
        {!isFuture && (
          <TodayQuickLog
            items={quickLog}
            title={hasMissing ? (isToday ? 'Te falta registrar' : 'Sin registrar este día') : 'Registrar'}
          />
        )}

        {/* ── Tu día ────────────────────────────────────────── */}
        {(plannedActivityRows.length > 0 || taskRows.length > 0) ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">
                {isToday ? 'Tu día' : isFuture ? 'Plan del día' : 'Plan del día'}
              </p>
              {pendingCount > 0 && !isFuture && (
                <span className="text-xs text-ink/60">
                  {isPast ? `${pendingCount} sin hacer` : `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`}
                </span>
              )}
            </div>
            <div className="rounded-4xl bg-white shadow-card p-2">
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
                    className={`w-full flex items-start gap-3 px-3 py-3.5 text-left rounded-3xl transition-all border-b border-ink/5 last:border-b-0 ${
                      isPriority ? 'bg-canvas-light' : ''
                    }`}
                  >
                    <div className={`h-[22px] w-[22px] mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-moss' : isPast ? 'border-[1.5px] border-ember/50' : 'border-[1.5px] border-ink/20'
                    }`}>
                      {isDone && <Check size={11} strokeWidth={2.5} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.time && <p className="text-xs text-ink/60 leading-none mb-1">{entry.time}</p>}
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-semibold leading-snug ${isDone ? 'text-ink' : 'text-ink/80'}`}>
                          {entry.label}
                        </p>
                        {isPriority && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-ink/60 bg-canvas rounded-full px-1.5 py-0.5 flex-shrink-0">
                            Prioridad
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink/60 mt-0.5">{detailLine}</p>
                    </div>
                    {isAuto && <span className="text-[10px] text-ink/40 flex-shrink-0 mt-0.5">auto</span>}
                  </button>
                );
              })}

              {taskRows.map(({ entry, index }) => (
                <button
                  key={`task-${entry.id}`}
                  type="button"
                  onClick={() => PlanService.updatePlanEntry(selectedDate, index, { ...entry, completed: !entry.completed })}
                  className="w-full flex items-start gap-3 px-3 py-3.5 text-left rounded-3xl border-b border-ink/5 last:border-b-0"
                >
                  <div className={`h-[22px] w-[22px] mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.completed ? 'bg-moss' : 'border-[1.5px] border-ink/20'
                  }`}>
                    {entry.completed && <Check size={11} strokeWidth={2.5} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {entry.time && <p className="text-xs text-ink/60 leading-none mb-1">{entry.time}</p>}
                    <p className={`text-sm font-semibold leading-snug ${entry.completed ? 'text-ink' : 'text-ink/80'}`}>
                      {entry.label}
                    </p>
                    <p className="text-xs text-ink/60 mt-0.5">{entry.subtitle || 'Sin hora fijada'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : !isPast && (
          <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">
              {isToday ? 'Tu día' : 'Plan del día'}
            </p>
            <p className="text-sm font-semibold text-ink">{isToday ? 'Sin plan para hoy' : 'Nada planificado este día'}</p>
            <div className="flex flex-wrap gap-2">
              {onNavToPlan && (
                <button
                  type="button"
                  onClick={onNavToPlan}
                  className="rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-white active:scale-95 transition-transform"
                >
                  Planificar
                </button>
              )}
              {isToday && (
                <button
                  type="button"
                  onClick={() => { setEditActivity(undefined); setPrefillActivity(undefined); setShowAddActivity(true); }}
                  className="flex items-center gap-1.5 rounded-full bg-canvas px-4 py-2.5 text-xs font-semibold text-ink active:scale-95 transition-transform"
                >
                  <Plus size={13} strokeWidth={2.5} /> Registrar actividad
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Movimiento / Alimentación / Recuperación ──────── */}
        {!isFuture && (
          <>
            <TodayMovementCard
              steps={movementSteps}
              stepsGoal={STEPS_GOAL}
              activeCalories={movementActiveCalories}
              caloriesGoal={ACTIVE_CALORIES_GOAL}
              onOpenSteps={() => setShowPasosSheet(true)}
              onOpenCalories={() => setShowKcalSheet(true)}
            />

            <TodayNutritionCard
              dailyNutrition={dailyNutrition}
              caloriesOut={totalCaloriesOut}
              isToday={isToday}
              onOpenDetail={() => dailyNutrition ? setShowAlimentacionSheet(true) : setShowAddMeal(true)}
              onAddMeal={() => setShowAddMeal(true)}
            />

            {hasRecoveryData && (
              <TodayRecoveryCard
                hrv={todayMovement?.hrv}
                restingHeartRate={todayMovement?.restingHeartRate}
                stressAvg={todayMovement?.stressAvg}
                baseline={recoveryBaseline}
              />
            )}
          </>
        )}

        {/* ── Actividades ───────────────────────────────────── */}
        {!isFuture && extraActivities.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50 px-1">
              {plannedActivityRows.length > 0 ? 'Otras actividades' : 'Actividades'}
            </p>
            <div className="space-y-3">
              {extraActivities.map((act) => (
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

        {/* ── Lo que importa esta semana ───────────────────── */}
        {phaseInjury && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50 px-1">
              Lo que importa esta semana
            </p>
            <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-ink">{phaseInjury.name} · {phaseInjury.phaseLabel}</p>
                  {activeProgram && (
                    <p className="text-xs text-ink/60 mt-0.5">
                      Semana {activeProgram.currentWeek} de {activeProgram.totalWeeks}
                    </p>
                  )}
                </div>
                {phaseInjury.phaseTargetSessions != null && (
                  <p className="text-sm font-semibold text-ink/60">
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
                  <span className="text-ink/60">
                    Próxima: {rehabPlanEntry.label}{rehabPlanEntry.time ? ` · hoy ${rehabPlanEntry.time}` : ''}
                  </span>
                  {phaseInjury.phaseTargetSessions != null && (
                    <span className="text-ink/60 font-semibold">
                      {Math.round((phaseCompletedSessions / phaseInjury.phaseTargetSessions) * 100)}%
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-ink/60">{phaseTipText}</p>
            </div>
          </div>
        )}

        {/* ── Lo que he visto ───────────────────────────────── */}
        {!isFuture && (
          <TodayInsightCard
            date={selectedDate}
            ruleInsight={insight}
            isToday={isToday}
            onAskAgent={onAskAgent}
          />
        )}

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
      <PasosDetailSheet
        metric="activeCalories"
        isOpen={showKcalSheet}
        onClose={() => setShowKcalSheet(false)}
        onEdit={() => { setShowKcalSheet(false); setShowMovementSheet(true); }}
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
