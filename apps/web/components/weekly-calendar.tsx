'use client';

import { useRef } from 'react';
import { DailyCheckIn, InjuryLog, WeightEntry, ActivityEntry, DailyHealthMetricEntry } from '../stores/recovery-store';
import type { PlanEntry } from '../stores/plan-store';
import { weekDates, dayInitial, todayIso } from '../lib/date';

const SWIPE_MIN_PX = 48;

const LEGEND = [
  { label: 'Actividad', className: 'bg-moss' },
  { label: 'Movimiento', className: 'bg-sand' },
  { label: 'Peso', className: 'bg-ember' },
  { label: 'Rehab', className: 'bg-ink/70' },
  { label: 'Dolor', className: 'bg-red-400' },
];

export function WeeklyCalendar({
  selectedDate,
  onSelect,
  onShiftWeek,
  checkIns,
  weights,
  activities,
  injuryLogs,
  healthMetrics,
  plan,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  /** Called with -1 / +1 when the user swipes to the previous / next week. */
  onShiftWeek?: (direction: -1 | 1) => void;
  checkIns: DailyCheckIn[];
  weights: WeightEntry[];
  activities: ActivityEntry[];
  injuryLogs: InjuryLog[];
  healthMetrics?: DailyHealthMetricEntry[];
  plan?: Record<string, PlanEntry[]>;
}) {
  const dates = weekDates(selectedDate);
  const today = todayIso();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !onShiftWeek) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onShiftWeek(dx < 0 ? 1 : -1);
    }
  }

  return (
    <div className="space-y-2.5">
      <div
        className="grid grid-cols-7 gap-1 touch-pan-y"
        onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={handleTouchEnd}
      >
        {dates.map((date) => {
          const isSelected  = selectedDate === date;
          const isToday     = date === today;
          const hasCheckIn  = checkIns.some((e) => e.date === date);
          const hasWeight   = weights.some((e) => e.date === date);
          const hasActivity = activities.some((e) => e.date === date);
          const hasRehab    = checkIns.some((e) => e.date === date && e.habits.rehab);
          const hasPain     = injuryLogs.some((e) => e.date === date);
          const hasMovement = healthMetrics?.some((entry) => entry.date === date && (entry.steps > 0 || entry.activeCalories > 0)) ?? false;
          // Sessions still to do: planned for today or later
          const plannedCount = date >= today
            ? (plan?.[date] ?? []).filter((entry) => entry.kind !== 'task').length
            : 0;

          const filled = [
            hasActivity && 'bg-moss',
            hasMovement && 'bg-sand',
            hasWeight   && 'bg-ember',
            hasRehab    && 'bg-ink/70',
            hasPain     && 'bg-red-400',
          ].filter(Boolean) as string[];
          const rings = Math.min(plannedCount, Math.max(0, 4 - filled.length));
          const filledShown = filled.slice(0, 4 - rings);

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={date}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-1.5 rounded-2xl py-2.5 px-1 transition-all duration-200 ${
                isSelected
                  ? 'bg-ink scale-[1.06] shadow-md'
                  : isToday
                  ? 'bg-ember/10'
                  : hasCheckIn
                  ? 'bg-canvas-light'
                  : 'hover:bg-canvas-light/60'
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider leading-none ${
                  isSelected ? 'text-white/70' : isToday ? 'text-ember/80' : 'text-ink/50'
                }`}
              >
                {dayInitial(date)}
              </span>

              <span
                className={`text-xl font-bold leading-none ${
                  isSelected ? 'text-white' : isToday ? 'text-ember' : 'text-ink'
                }`}
              >
                {date.slice(8, 10)}
              </span>

              <div className="flex gap-[3px] h-2 items-center justify-center">
                {filledShown.map((color, i) => (
                  <span key={`f-${i}`} className={`h-2 w-2 rounded-full ${color}`} />
                ))}
                {Array.from({ length: rings }).map((_, i) => (
                  <span
                    key={`r-${i}`}
                    className={`h-2 w-2 rounded-full border-[1.5px] ${isSelected ? 'border-white/60' : 'border-ink/40'}`}
                  />
                ))}
                {filledShown.length + rings === 0 && <span className="h-2 w-2 rounded-full bg-transparent" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-[10px] text-ink/50">
            <span className={`h-1.5 w-1.5 rounded-full ${item.className}`} />
            {item.label}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[10px] text-ink/50">
          <span className="h-1.5 w-1.5 rounded-full border border-ink/40" />
          Planificado
        </span>
      </div>
    </div>
  );
}
