'use client';

import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2, Circle,
  Scale, Zap,
  Sparkles, Plus, ChevronRight,
} from 'lucide-react';
import { WeeklyCalendar } from './weekly-calendar';
import { MonthlyCalendar } from './monthly-calendar';
import { WeightSheet } from './weight-sheet';
import { WeightScreen } from './weight-screen';
import { ActivityCard } from './actividades-screen';
import { AddActivitySheet } from './add-activity-sheet';
import { useRecoveryStore } from '../stores/recovery-store';
import { RecoveryService } from '../lib/services';
import { buildRuleBasedInsight } from '../lib/metrics';
import { formatShortDate, sameDay, todayIso } from '../lib/date';
import type { ActivityEntry } from '../stores/recovery-store';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function weightAgo(dateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T12:00:00'); d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} días`;
}

function WeightCard({
  onOpen,
  onAdd,
  weights,
}: {
  onOpen: () => void;
  onAdd: () => void;
  weights: import('../stores/recovery-store').WeightEntry[];
}) {
  const sorted  = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const latest  = sorted[0];

  return (
    <div className="w-full rounded-3xl bg-white shadow-card px-5 py-4 flex items-center justify-between">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
      >
        <div className="h-10 w-10 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0">
          <Scale size={18} className="text-moss" />
        </div>
        <div>
          {latest ? (
            <p className="text-base font-bold text-ink leading-tight">
              {latest.weightKg.toFixed(1)} kg
              <span className="text-xs font-normal text-ink/40 ml-2">{weightAgo(latest.date)}</span>
            </p>
          ) : (
            <p className="text-sm text-ink/30">Sin registros</p>
          )}
        </div>
      </button>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <button
          type="button"
          onClick={onAdd}
          className="h-8 w-8 rounded-xl bg-ink flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Añadir peso"
        >
          <Plus size={15} className="text-white" />
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Ver historial de peso"
        >
          <ChevronRight size={15} className="text-ink/40" />
        </button>
      </div>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {done
        ? <CheckCircle2 size={20} className="text-moss flex-shrink-0" />
        : <Circle size={20} className="text-ink/20 flex-shrink-0" />}
      <span className={`text-sm ${done ? 'text-ink/40 line-through' : 'text-ink'}`}>{label}</span>
    </div>
  );
}

export function TodayScreen() {
  const [showMonthly,      setShowMonthly]      = useState(false);
  const [showWeightSheet,  setShowWeightSheet]  = useState(false);
  const [showWeightScreen, setShowWeightScreen] = useState(false);
  const [showAddActivity,  setShowAddActivity]  = useState(false);
  const [editActivity,     setEditActivity]     = useState<ActivityEntry | undefined>(undefined);

  const {
    selectedDate, setSelectedDate,
    checkIns, weightEntries, activities, injuryLogs, injuries,
  } = useRecoveryStore();

  const today   = todayIso();
  const isToday = sameDay(selectedDate, today);

  // Data for the selected day
  const dayCheckIn    = checkIns.find((c) => sameDay(c.date, selectedDate));
  const dayActivities = activities.filter((a) => sameDay(a.date, selectedDate));
  const dayLogs       = injuryLogs.filter((l) => sameDay(l.date, selectedDate));

  const hasRehab    = !!(dayCheckIn?.habits.rehab || dayLogs.some((l) => l.didRehab));
  const hasActivity = dayActivities.length > 0;

  // Insight
  const insight = buildRuleBasedInsight({
    activeInjuries: injuries, injuryLogs, checkIns, weights: weightEntries,
  });

  // Month label shown above the calendar
  const selDateObj = new Date(selectedDate + 'T12:00:00');
  const monthLabel = `${MONTH_NAMES[selDateObj.getMonth()]} ${selDateObj.getFullYear()}`;

  // Active injuries
  const activeInjuries = injuries.filter((i) => i.status !== 'resolved');

  // Human-readable date label
  const dayLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">

        {/* ── Weekly calendar block ─────────────────────────── */}
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

        {/* ── Tasks checklist ───────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Tareas del día
          </p>
          <div className="rounded-4xl bg-white shadow-card px-5 py-1">
            <div className="divide-y divide-ink/5">
              <div className="pb-1"><CheckItem done={hasRehab}    label="Rehabilitación" /></div>
              <div className="pt-1"><CheckItem done={hasActivity} label="Actividad"       /></div>
            </div>
          </div>
        </div>

        {/* ── Activities ───────────────────────────────────── */}
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

        {/* ── Weight card ──────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Peso
          </p>
          <WeightCard
            onOpen={() => setShowWeightScreen(true)}
            onAdd={() => setShowWeightSheet(true)}
            weights={weightEntries}
          />
        </div>

        {/* ── Pain logs ────────────────────────────────────── */}
        {dayLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Dolor registrado
            </p>
            <div className="rounded-4xl bg-white shadow-card p-5 space-y-2.5">
              {dayLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                      log.painLevel >= 5 ? 'bg-ember-light' : 'bg-moss-light'
                    }`}
                  >
                    <Zap
                      size={14}
                      className={log.painLevel >= 5 ? 'text-ember' : 'text-moss'}
                    />
                  </div>
                  <span className="text-sm text-ink">
                    <span className="font-semibold">Dolor {log.painLevel}/10</span>
                    {log.didRehab && (
                      <span className="ml-2 text-[11px] bg-moss-light text-moss rounded-full px-2 py-0.5">
                        Rehab ✓
                      </span>
                    )}
                    {log.notes && (
                      <span className="text-ink/40"> · {log.notes}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Injury status ─────────────────────────────────── */}
        {activeInjuries.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
              Lesiones activas
            </p>
            {activeInjuries.map((injury) => {
              const logs = injuryLogs.filter((l) => l.injuryId === injury.id);
              const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
              const avg =
                recent.length > 0
                  ? Number(
                      (recent.reduce((s, l) => s + l.painLevel, 0) / recent.length).toFixed(1),
                    )
                  : null;
              const painColor =
                avg === null ? 'text-ink/30'
                : avg <= 3   ? 'text-moss'
                : avg <= 6   ? 'text-ember'
                : 'text-red-500';

              let trend: 'mejorando' | 'empeorando' | 'estable' | null = null;
              if (recent.length >= 4) {
                const half  = Math.floor(recent.length / 2);
                const newer = recent.slice(0, half).reduce((s, l) => s + l.painLevel, 0) / half;
                const older = recent.slice(half).reduce((s, l) => s + l.painLevel, 0) / half;
                if (newer < older - 0.5)      trend = 'mejorando';
                else if (newer > older + 0.5) trend = 'empeorando';
                else                          trend = 'estable';
              }

              return (
                <div key={injury.id} className="rounded-3xl bg-white shadow-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{injury.name}</p>
                      {injury.bodyPart && (
                        <p className="text-xs text-ink/40 capitalize mt-0.5">{injury.bodyPart}</p>
                      )}
                      {trend && (
                        <p
                          className={`text-xs mt-1 font-medium ${
                            trend === 'mejorando'  ? 'text-moss'
                            : trend === 'empeorando' ? 'text-ember'
                            : 'text-ink/40'
                          }`}
                        >
                          Tendencia: {trend}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-2xl font-bold leading-none ${painColor}`}>
                        {avg ?? '--'}
                        <span className="text-xs font-normal text-ink/30">/10</span>
                      </p>
                      <p className="text-[10px] text-ink/30 mt-0.5">dolor medio</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Contextual insight ────────────────────────────── */}
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

      {/* ── Sheets & modals ───────────────────────────────────── */}
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
        onClose={() => { setShowAddActivity(false); setEditActivity(undefined); }}
        editActivity={editActivity}
      />
      <WeightSheet
        isOpen={showWeightSheet}
        onClose={() => setShowWeightSheet(false)}
        defaultDate={selectedDate}
      />
      {showWeightScreen && (
        <WeightScreen onClose={() => setShowWeightScreen(false)} />
      )}
    </>
  );
}
