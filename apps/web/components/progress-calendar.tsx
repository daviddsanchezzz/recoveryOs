'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { todayIso } from '../lib/date';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getMonthCells(year: number, month: number): (string | null)[] {
  const firstDay    = new Date(year, month, 1).getDay();
  const offset      = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface ProgressCalendarProps {
  getDots: (year: number, month: number) => Record<string, string>;
  selectedDate: string;
  onSelect: (date: string) => void;
}

export function ProgressCalendar({ getDots, selectedDate, onSelect }: ProgressCalendarProps) {
  const today = todayIso();
  const now   = new Date(today + 'T12:00:00');

  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const cells    = useMemo(() => getMonthCells(year, month), [year, month]);
  const dotsByDate = useMemo(() => getDots(year, month), [getDots, year, month]);

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }, [month]);

  return (
    <div className="rounded-4xl bg-white shadow-card overflow-hidden">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="h-8 w-8 flex items-center justify-center rounded-full active:bg-canvas-light transition-colors"
        >
          <ChevronLeft size={16} className="text-ink/60" />
        </button>
        <p className="text-sm font-bold text-ink">{MONTH_NAMES[month]} {year}</p>
        <button
          type="button"
          onClick={nextMonth}
          className="h-8 w-8 flex items-center justify-center rounded-full active:bg-canvas-light transition-colors"
        >
          <ChevronRight size={16} className="text-ink/60" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="flex justify-center">
            <span className="text-[10px] font-semibold text-ink/30 uppercase tracking-wide">{d}</span>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-4">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const isSelected = date === selectedDate;
          const isToday    = date === today;
          const dotColor   = dotsByDate[date];
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all duration-150 ${
                isSelected ? 'bg-ink' : isToday ? 'bg-ember/10' : 'active:bg-canvas-light'
              }`}
            >
              <span className={`text-sm font-bold leading-none ${
                isSelected ? 'text-white' : isToday ? 'text-ember' : 'text-ink'
              }`}>
                {date.slice(8)}
              </span>
              <span className={`h-1 w-1 rounded-full transition-colors ${
                dotColor
                  ? `${dotColor}${isSelected ? ' opacity-50' : ''}`
                  : 'opacity-0 bg-transparent'
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
