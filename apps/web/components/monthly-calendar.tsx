'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DailyCheckIn, WeightEntry, ActivityEntry, InjuryLog } from '../stores/recovery-store';
import { todayIso } from '../lib/date';
import { Portal } from './portal';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getMonthCells(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function MonthlyCalendar({
  isOpen,
  onClose,
  selectedDate,
  onSelect,
  checkIns,
  weights,
  activities,
  injuryLogs,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (date: string) => void;
  checkIns: DailyCheckIn[];
  weights: WeightEntry[];
  activities: ActivityEntry[];
  injuryLogs: InjuryLog[];
}) {
  const [year, setYear] = useState(() => new Date(selectedDate + 'T12:00:00').getFullYear());
  const [month, setMonth] = useState(() => new Date(selectedDate + 'T12:00:00').getMonth());

  useEffect(() => {
    if (isOpen) {
      const d = new Date(selectedDate + 'T12:00:00');
      setYear(d.getFullYear());
      setMonth(d.getMonth());
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const cells = getMonthCells(year, month);
  const today = todayIso();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function handleSelect(date: string) {
    onSelect(date);
    onClose();
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="mx-auto max-w-md bg-canvas rounded-t-4xl shadow-card-lg pb-8">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-ink/20" />
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <button
              type="button"
              onClick={prevMonth}
              className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center active:scale-95 transition-transform"
            >
              <ChevronLeft size={18} className="text-ink" />
            </button>
            <p className="text-base font-bold text-ink">
              {MONTH_NAMES[month]} {year}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="h-9 w-9 rounded-full bg-canvas-light flex items-center justify-center active:scale-95 transition-transform"
            >
              <ChevronRight size={18} className="text-ink" />
            </button>
          </div>

          <div className="grid grid-cols-7 px-4 mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d} className="flex justify-center">
                <span className="text-[11px] font-semibold text-ink/30 uppercase tracking-wide">{d}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 px-4">
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;

              const isSelected = date === selectedDate;
              const isToday = date === today;
              const hasActivity = activities.some((a) => a.date === date);
              const hasWeight = weights.some((w) => w.date === date);
              const hasRehab = checkIns.some((c) => c.date === date && c.habits.rehab);
              const hasPain = injuryLogs.some((l) => l.date === date);

              const dots = [
                hasActivity && 'bg-moss',
                hasWeight && 'bg-ember',
                hasRehab && 'bg-ink',
                hasPain && 'bg-red-400',
              ].filter(Boolean) as string[];

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleSelect(date)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-2xl transition-all duration-150 ${
                    isSelected
                      ? 'bg-ink'
                      : isToday
                      ? 'bg-ember/10'
                      : 'active:bg-canvas-light'
                  }`}
                >
                  <span
                    className={`text-sm font-bold leading-none ${
                      isSelected ? 'text-white' : isToday ? 'text-ember' : 'text-ink'
                    }`}
                  >
                    {date.slice(8, 10)}
                  </span>
                  <div className="flex gap-0.5 h-1.5 items-center">
                    {dots.slice(0, 3).map((color, idx) => (
                      <span
                        key={idx}
                        className={`h-1 w-1 rounded-full ${color} ${isSelected ? 'opacity-60' : ''}`}
                      />
                    ))}
                    {dots.length === 0 && <span className="h-1 w-1" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center mt-6 px-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-canvas-light px-8 py-3 text-sm font-medium text-ink/60 active:scale-95 transition-transform"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
