'use client';

import { WeeklyCalendar } from './weekly-calendar';
import { useRecoveryStore } from '../stores/recovery-store';
import {
  buildRuleBasedInsight,
  calculateRecoveryScore,
  calculateRehabAdherence,
  calculateWeightTrend,
  weeklyActivityStats,
  weeklyPainAverage,
} from '../lib/metrics';
import { sameDay, todayIso } from '../lib/date';
import { useSessionStore } from '../stores/session-store';
import { Sparkles, Scale, Zap, Bike, CheckCircle2, Circle } from 'lucide-react';

function RecoveryRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#54715a' : score >= 50 ? '#b56b45' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e8e3d8" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-ink leading-none">{score}</span>
        <span className="text-xs text-ink/50 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      {done ? (
        <CheckCircle2 size={20} className="text-moss flex-shrink-0" />
      ) : (
        <Circle size={20} className="text-ink/20 flex-shrink-0" />
      )}
      <span className={`text-sm ${done ? 'text-ink/40 line-through' : 'text-ink'}`}>{label}</span>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-3xl p-4 space-y-2 ${accent ? 'bg-ink' : 'bg-white shadow-card'}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent ? 'bg-white/10' : 'bg-canvas'}`}>
        <Icon size={16} className={accent ? 'text-white' : 'text-moss'} />
      </div>
      <div>
        <p className={`text-[11px] font-medium uppercase tracking-wide ${accent ? 'text-white/60' : 'text-ink/40'}`}>
          {label}
        </p>
        <p className={`text-xl font-bold leading-tight mt-0.5 ${accent ? 'text-white' : 'text-ink'}`}>{value}</p>
        {sub && (
          <p className={`text-[11px] mt-0.5 ${accent ? 'text-white/50' : 'text-ink/40'}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const user = useSessionStore((state) => state.user);
  const {
    selectedDate,
    setSelectedDate,
    checkIns,
    weightEntries,
    activities,
    injuryLogs,
    injuries,
  } = useRecoveryStore();

  const today = todayIso();
  const todayCheckIn = checkIns.find((e) => sameDay(e.date, today));
  const todayActivities = activities.filter((e) => sameDay(e.date, today));
  const currentWeight = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const rehabAdherence = calculateRehabAdherence(checkIns);
  const painAverage = weeklyPainAverage(injuries, injuryLogs);
  const weeklyActivity = weeklyActivityStats(activities);
  const weightTrend = calculateWeightTrend(weightEntries);
  const recoveryScore = calculateRecoveryScore({
    activeInjuries: injuries,
    injuryLogs,
    todayCheckIn,
    todayActivities,
  });
  const insight = buildRuleBasedInsight({ activeInjuries: injuries, injuryLogs, checkIns, weights: weightEntries });

  const hasRehabToday = todayCheckIn?.habits.rehab || injuryLogs.some((l) => sameDay(l.date, today) && l.didRehab);
  const hasFoodToday = !!todayCheckIn?.notes;
  const hasActivityToday = todayActivities.length > 0;
  const hasWeightToday = weightEntries.some((e) => sameDay(e.date, today));

  const firstName = user?.name?.split(' ')[0] ?? 'David';

  const now = new Date();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dateLabel = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]}`;

  return (
    <div className="px-4 pt-12 pb-4 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-ink/40 uppercase tracking-widest">{dateLabel}</p>
        <h1 className="text-3xl font-bold text-ink leading-tight">
          Hola, {firstName} 👋
        </h1>
        <p className="text-sm text-ink/50">Vamos a seguir recuperando bien.</p>
      </div>

      {/* Recovery Score */}
      <div className="rounded-4xl bg-white shadow-card p-6 flex items-center gap-6">
        <RecoveryRing score={recoveryScore} />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">Recovery Score</p>
            <p className="text-sm text-ink/60 mt-1 leading-snug">
              {recoveryScore >= 75
                ? 'Recuperación en buen camino'
                : recoveryScore >= 50
                ? 'Sigue con la rehab diaria'
                : 'Necesitas descansar más'}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-ink/40">
              <span>Rehab</span>
              <span>{rehabAdherence}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
              <div
                className="h-full rounded-full bg-moss transition-all duration-700"
                style={{ width: `${rehabAdherence}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Esta semana</p>
          <span className="text-xs text-ink/40 font-medium">Sem. actual</span>
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

      {/* Today Checklist */}
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
        <p className="text-sm font-semibold text-ink">Hoy — tareas</p>
        <div className="divide-y divide-ink/5">
          <div className="pb-2">
            <ChecklistItem done={hasRehabToday} label="Rehabilitación tobillo" />
          </div>
          <div className="py-2">
            <ChecklistItem done={hasFoodToday} label="Registrar comida del día" />
          </div>
          <div className="py-2">
            <ChecklistItem done={hasActivityToday} label="Actividad o bici" />
          </div>
          <div className="pt-2">
            <ChecklistItem done={hasWeightToday} label="Registrar peso" />
          </div>
        </div>
      </div>

      {/* 2x2 Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Scale}
          label="Peso"
          value={currentWeight ? `${currentWeight.weightKg.toFixed(1)} kg` : '--'}
          sub={weightTrend.weeklyChange !== null
            ? `${weightTrend.weeklyChange > 0 ? '+' : ''}${weightTrend.weeklyChange} kg semana`
            : undefined}
        />
        <MetricCard
          icon={Zap}
          label="Dolor tobillo"
          value={painAverage !== null ? `${painAverage}/10` : '--'}
          sub="Lesiones activas"
          accent={painAverage !== null && painAverage >= 5}
        />
        <MetricCard
          icon={Bike}
          label="Actividad"
          value={weeklyActivity.totalMinutes > 0
            ? `${Math.floor(weeklyActivity.totalMinutes / 60)}h ${weeklyActivity.totalMinutes % 60}m`
            : `${weeklyActivity.totalMinutes} min`}
          sub={`${weeklyActivity.totalSessions} sesiones`}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Rehab"
          value={`${rehabAdherence}%`}
          sub="últimos 7 días"
        />
      </div>

      {/* AI Insight */}
      <div className="rounded-4xl bg-ink p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Insight</p>
        </div>
        <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}
