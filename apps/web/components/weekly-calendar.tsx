'use client';

import { DailyCheckIn, InjuryLog, WeightEntry, ActivityEntry } from '../stores/recovery-store';
import { formatDayLabel, weekDates } from '../lib/date';

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
    <div className="grid grid-cols-7 gap-2">
      {dates.map((date) => {
        const hasCheckIn = checkIns.some((entry) => entry.date === date);
        const hasWeight = weights.some((entry) => entry.date === date);
        const hasActivity = activities.some((entry) => entry.date === date);
        const hasRehab = checkIns.some((entry) => entry.date === date && entry.habits.rehab);
        const hasPainLog = injuryLogs.some((entry) => entry.date === date);

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(date)}
            className={`rounded-[24px] border px-2 py-3 text-center ${
              selectedDate === date
                ? 'border-ink bg-ink text-white'
                : 'border-black/10 bg-white/80 text-ink'
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-70">{formatDayLabel(date)}</p>
            <p className="mt-2 text-lg font-semibold">{date.slice(8, 10)}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              {hasCheckIn ? <span className="h-1.5 w-1.5 rounded-full bg-moss" /> : null}
              {hasWeight ? <span className="h-1.5 w-1.5 rounded-full bg-ember" /> : null}
              {hasActivity ? <span className="h-1.5 w-1.5 rounded-full bg-sand" /> : null}
              {hasRehab ? <span className="h-1.5 w-1.5 rounded-full bg-ink" /> : null}
              {hasPainLog ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

