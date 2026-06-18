'use client';

import { DailyCheckIn, InjuryLog, WeightEntry, ActivityEntry } from '../stores/recovery-store';
import { weekDates } from '../lib/date';

const DAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function getDayInitial(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return DAY_INITIALS[date.getDay()];
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export function WeeklyCalendar({
  selectedDate,
  onSelect,
  checkIns,
  weights,
  activities,
  injuryLogs,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  checkIns: DailyCheckIn[];
  weights: WeightEntry[];
  activities: ActivityEntry[];
  injuryLogs: InjuryLog[];
}) {
  const dates = weekDates();

  return (
    <div className="grid grid-cols-7 gap-1">
      {dates.map((date) => {
        const isSelected  = selectedDate === date;
        const today       = isToday(date);
        const hasCheckIn  = checkIns.some((e) => e.date === date);
        const hasWeight   = weights.some((e) => e.date === date);
        const hasActivity = activities.some((e) => e.date === date);
        const hasRehab    = checkIns.some((e) => e.date === date && e.habits.rehab);
        const hasPain     = injuryLogs.some((e) => e.date === date);

        const dots = [
          hasActivity && 'bg-moss',
          hasWeight   && 'bg-ember',
          hasRehab    && 'bg-ink/70',
          hasPain     && 'bg-red-400',
        ].filter(Boolean) as string[];

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(date)}
            className={`flex flex-col items-center gap-2 rounded-2xl py-3 px-1 transition-all duration-200 ${
              isSelected
                ? 'bg-ink scale-[1.08] shadow-md'
                : today
                ? 'bg-ember/10'
                : hasCheckIn
                ? 'bg-canvas-light'
                : 'hover:bg-canvas-light/60'
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider leading-none ${
                isSelected ? 'text-white/60' : today ? 'text-ember/70' : 'text-ink/30'
              }`}
            >
              {getDayInitial(date)}
            </span>

            <span
              className={`text-xl font-bold leading-none ${
                isSelected ? 'text-white' : today ? 'text-ember' : 'text-ink'
              }`}
            >
              {date.slice(8, 10)}
            </span>

            <div className="flex gap-0.5 h-1.5 items-center justify-center">
              {dots.slice(0, 3).map((color, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${color} ${isSelected ? 'opacity-60' : ''}`}
                />
              ))}
              {dots.length === 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
