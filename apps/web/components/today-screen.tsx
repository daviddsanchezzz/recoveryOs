'use client';

import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Scale, Zap, Moon, Dumbbell,
  Sparkles, Plus, ChevronRight, Check,
} from 'lucide-react';
import { WeeklyCalendar }   from './weekly-calendar';
import { MonthlyCalendar }  from './monthly-calendar';
import { WeightSheet }      from './weight-sheet';
import { WeightScreen }     from './weight-screen';
import { SleepSheet }       from './sleep-sheet';
import { DolorSheet }       from './dolor-sheet';
import { ActivityCard }     from './actividades-screen';
import { AddActivitySheet } from './add-activity-sheet';
import { useRecoveryStore } from '../stores/recovery-store';
import { RecoveryService }  from '../lib/services';
import { buildRuleBasedInsight } from '../lib/metrics';
import { formatShortDate, sameDay, todayIso } from '../lib/date';
import type { ActivityEntry } from '../stores/recovery-store';

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
      {/* Checkbox circle */}
      <div className={`h-[22px] w-[22px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
        done ? doneBg : 'border-[1.5px] border-ink/15'
      }`}>
        {done
          ? <Check size={11} strokeWidth={2.5} className="text-white" />
          : <Icon size={10} className="text-ink/20" />
        }
      </div>

      {/* Label + value */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-none transition-colors ${done ? 'text-ink' : 'text-ink/45'}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 leading-none ${value ? doneColor : 'text-ink/25'}`}>
          {value ?? 'Sin registrar'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="h-8 w-8 rounded-xl bg-ink flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={14} className="text-white" />
          </button>
        )}
        {onDetail && (
          <button
            type="button"
            onClick={onDetail}
            className="h-8 w-8 rounded-xl bg-canvas flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRight size={14} className="text-ink/40" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function TodayScreen() {
  const [showMonthly,      setShowMonthly]      = useState(false);
  const [showWeightSheet,  setShowWeightSheet]  = useState(false);
  const [showWeightScreen, setShowWeightScreen] = useState(false);
  const [showSleepSheet,   setShowSleepSheet]   = useState(false);
  const [showDolorSheet,   setShowDolorSheet]   = useState(false);
  const [showAddActivity,  setShowAddActivity]  = useState(false);
  const [editActivity,     setEditActivity]     = useState<ActivityEntry | undefined>(undefined);

  const {
    selectedDate, setSelectedDate,
    checkIns, weightEntries, activities, injuryLogs, injuries, sleepEntries,
  } = useRecoveryStore();

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
            />
            <DailyRow
              icon={Dumbbell}
              label="Actividad"
              value={activityValue}
              done={dayActivities.length > 0}
              doneColor="text-moss"
              doneBg="bg-moss"
              onAdd={() => setShowAddActivity(true)}
            />
            <DailyRow
              icon={Scale}
              label="Peso"
              value={weightValue}
              done={!!todayWeight}
              doneColor="text-ember"
              doneBg="bg-ember"
              onAdd={() => setShowWeightSheet(true)}
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
              />
            )}
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
                      {injury.bodyPart && <p className="text-xs text-ink/40 capitalize mt-0.5">{injury.bodyPart}</p>}
                      {trend && (
                        <p className={`text-xs mt-1 font-medium ${trend === 'mejorando' ? 'text-moss' : trend === 'empeorando' ? 'text-ember' : 'text-ink/40'}`}>
                          Tendencia: {trend}
                        </p>
                      )}
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
        onClose={() => { setShowAddActivity(false); setEditActivity(undefined); }}
        editActivity={editActivity}
      />
      <WeightSheet
        isOpen={showWeightSheet}
        onClose={() => setShowWeightSheet(false)}
        defaultDate={selectedDate}
        defaultKg={todayWeight?.weightKg}
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
      {showWeightScreen && (
        <WeightScreen onClose={() => setShowWeightScreen(false)} />
      )}
    </>
  );
}
