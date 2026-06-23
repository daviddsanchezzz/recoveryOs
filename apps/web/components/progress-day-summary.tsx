'use client';

import { Flame, Footprints, Moon, Scale, Dumbbell, Zap } from 'lucide-react';
import { sameDay } from '../lib/date';
import { ACTIVE_CALORIES_GOAL, STEPS_GOAL } from '../lib/health-metrics';
import type { ProgressStoreData } from '../lib/progress-metrics';

function fmtSleepH(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

function fmtMins(v: number): string {
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function ProgressDaySummary({ date, data }: { date: string; data: ProgressStoreData }) {
  const label = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const sleepEntry    = data.sleepEntries.find((s) => sameDay(s.date, date));
  const weightEntry   = data.weightEntries.find((w) => sameDay(w.date, date));
  const dayActivities = data.activities.filter((a) => sameDay(a.date, date));
  const dayLogs       = data.injuryLogs.filter((l) => sameDay(l.date, date));
  const movementEntry = data.dailyHealthMetrics.find((entry) => sameDay(entry.date, date));

  const avgPain   = dayLogs.length > 0
    ? (dayLogs.reduce((s, l) => s + l.painLevel, 0) / dayLogs.length).toFixed(1)
    : null;
  const totalMins = dayActivities.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);

  const rows: { icon: React.ElementType; rowLabel: string; value: string | null; color: string }[] = [
    {
      icon: Moon,
      rowLabel: 'Sueño',
      value: sleepEntry
        ? `${fmtSleepH(sleepEntry.durationH)} · calidad ${sleepEntry.quality}/5`
        : null,
      color: 'text-sand',
    },
    {
      icon: Scale,
      rowLabel: 'Peso',
      value: weightEntry ? `${weightEntry.weightKg.toFixed(1)} kg` : null,
      color: 'text-ember',
    },
    {
      icon: Dumbbell,
      rowLabel: 'Actividad',
      value: dayActivities.length > 0
        ? `${dayActivities.length} sesión${dayActivities.length !== 1 ? 'es' : ''}${totalMins > 0 ? ` · ${fmtMins(totalMins)}` : ''}`
        : null,
      color: 'text-moss',
    },
    {
      icon: Footprints,
      rowLabel: 'Pasos',
      value: movementEntry ? `${movementEntry.steps.toLocaleString('es-ES')} / ${STEPS_GOAL.toLocaleString('es-ES')}` : null,
      color: 'text-moss',
    },
    {
      icon: Flame,
      rowLabel: 'Kcal activas',
      value: movementEntry ? `${movementEntry.activeCalories} / ${ACTIVE_CALORIES_GOAL}` : null,
      color: 'text-ember',
    },
    {
      icon: Zap,
      rowLabel: 'Dolor',
      value: avgPain ? `${avgPain} / 10` : null,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="rounded-4xl bg-white shadow-card px-5 py-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30 capitalize">{label}</p>
      <div className="divide-y divide-ink/5">
        {rows.map(({ icon: Icon, rowLabel, value, color }) => (
          <div key={rowLabel} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <Icon size={13} className={value ? color : 'text-ink/20'} />
              <span className="text-sm text-ink/50">{rowLabel}</span>
            </div>
            <span className={`text-sm font-semibold ${value ? 'text-ink' : 'text-ink/25'}`}>
              {value ?? 'Sin registrar'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
