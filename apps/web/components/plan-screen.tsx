'use client';

import { CheckCircle2, Circle, Zap, Target } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { weeklyActivityStats } from '../lib/metrics';
import { startOfWeekIso } from '../lib/date';

type WeeklyGoal = {
  label: string;
  total: number;
  unit: 'days' | 'min';
};

const WEEKLY_GOALS: WeeklyGoal[] = [
  { label: 'Rehab 5 días esta semana',  total: 5,   unit: 'days' },
  { label: '4 horas de bici',            total: 240, unit: 'min'  },
  { label: 'Registrar peso 5 días',      total: 5,   unit: 'days' },
];

function formatGoalValue(current: number, goal: WeeklyGoal): string {
  if (goal.unit === 'min') {
    const cur = current >= 60
      ? `${Math.floor(current / 60)}h${current % 60 > 0 ? ` ${current % 60}m` : ''}`
      : `${current}m`;
    const tot = `${Math.floor(goal.total / 60)}h`;
    return `${cur} / ${tot}`;
  }
  return `${current} / ${goal.total}`;
}

export function PlanScreen() {
  const { profile, checkIns, activities, weightEntries } = useRecoveryStore();
  const weeklyActivity = weeklyActivityStats(activities);

  const weekStart = startOfWeekIso();

  const rehabDays = checkIns.filter(
    (c) => c.date >= weekStart && c.habits.rehab,
  ).length;

  const weightDays = weightEntries.filter(
    (w) => w.date >= weekStart,
  ).length;

  const goalValues = [rehabDays, weeklyActivity.totalMinutes, weightDays];

  return (
    <div className="px-4 pt-4 pb-4 space-y-5 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">Plan</h1>
        <p className="text-sm text-ink/40">Tu hoja de ruta semanal</p>
      </div>

      {/* Active goals from profile */}
      {profile.activeGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
            Objetivos activos
          </p>
          <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
            {profile.activeGoals.map((goal) => (
              <div key={goal} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-xl bg-moss-light flex items-center justify-center flex-shrink-0">
                  <Target size={13} className="text-moss" />
                </div>
                <p className="text-sm text-ink">{goal}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly progress */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
          Esta semana
        </p>
        <div className="space-y-2">
          {WEEKLY_GOALS.map((goal, i) => {
            const current = goalValues[i];
            const pct = Math.min((current / goal.total) * 100, 100);
            const done = pct >= 100;

            return (
              <div key={goal.label} className="rounded-3xl bg-white shadow-card p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {done
                      ? <CheckCircle2 size={16} className="text-moss flex-shrink-0" />
                      : <Circle size={16} className="text-ink/20 flex-shrink-0" />}
                    <p className={`text-sm ${done ? 'text-ink/40' : 'text-ink'}`}>{goal.label}</p>
                  </div>
                  <span className="text-xs font-semibold text-ink/40 flex-shrink-0 tabular-nums">
                    {formatGoalValue(current, goal)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      done ? 'bg-moss' : 'bg-ink'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Habits — empty state */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 px-1">
          Hábitos
        </p>
        <div className="rounded-4xl bg-canvas-light border border-sand/40 p-6 flex flex-col items-center gap-2 text-center">
          <Zap size={20} className="text-ink/20" />
          <p className="text-sm text-ink/40">Añade hábitos para seguirlos aquí</p>
          <p className="text-xs text-ink/25">Próximamente</p>
        </div>
      </div>
    </div>
  );
}
