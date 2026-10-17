'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { todayIso } from '../lib/date';
import type { CalendarDot } from '../lib/progress-metrics';
import { ProgressCalendar } from './progress-calendar';

type CalendarView = 'mes' | 'anio' | 'historial';

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'mes',       label: 'Mes'       },
  { id: 'anio',      label: 'Año'       },
  { id: 'historial', label: 'Historial' },
];

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_ROWS    = ['L', '', 'X', '', 'V', '', 'D'];
const ALPHA       = { 1: 0.28, 2: 0.6, 3: 1 } as const;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
// Monday-based weekday of the 1st of a month (0 = Monday)
const mondayOffset = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;

function useYearDots(getDots: (y: number, m: number) => Record<string, CalendarDot>, year: number) {
  return useMemo(() => {
    const all: Record<string, CalendarDot> = {};
    for (let m = 0; m < 12; m++) Object.assign(all, getDots(year, m));
    return all;
  }, [getDots, year]);
}

// ── Año: 12 mini months ──────────────────────────────────────────────────────

function YearView({ getDots, selectedDate, onSelect, firstYear }: Props) {
  const today = todayIso();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const dots  = useYearDots(getDots, year);
  const count = Object.keys(dots).length;
  const currentYear = Number(today.slice(0, 4));

  return (
    <div className="rounded-4xl bg-white shadow-card px-4 pt-4 pb-5">
      <div className="flex items-center justify-between pb-3">
        <button type="button" disabled={year <= firstYear} onClick={() => setYear((y) => y - 1)}
          className="h-8 w-8 flex items-center justify-center rounded-full active:bg-canvas-light disabled:opacity-25">
          <ChevronLeft size={16} className="text-ink/60" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-ink">{year}</p>
          <p className="text-[11px] text-ink/40">{count} {count === 1 ? 'día' : 'días'} activos</p>
        </div>
        <button type="button" disabled={year >= currentYear} onClick={() => setYear((y) => y + 1)}
          className="h-8 w-8 flex items-center justify-center rounded-full active:bg-canvas-light disabled:opacity-25">
          <ChevronRight size={16} className="text-ink/60" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
        {MONTH_SHORT.map((label, m) => {
          const offset = mondayOffset(year, m);
          const days   = new Date(year, m + 1, 0).getDate();
          return (
            <div key={label}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 mb-1.5">{label}</p>
              <div className="grid grid-cols-7 gap-[3px]">
                {Array.from({ length: offset }, (_, i) => <span key={`o-${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const date = iso(year, m, i + 1);
                  const dot  = dots[date];
                  const sel  = date === selectedDate;
                  return (
                    <button
                      key={date}
                      type="button"
                      aria-label={date}
                      onClick={() => onSelect(date)}
                      className={`aspect-square rounded-full ${sel ? 'ring-2 ring-ink ring-offset-1' : ''} ${
                        date === today && !sel ? 'ring-1 ring-ember/60' : ''
                      }`}
                      style={dot ? { backgroundColor: dot.hex, opacity: ALPHA[dot.level] } : { backgroundColor: 'rgba(0,0,0,0.06)' }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Historial: one compact week-column heatmap per year ──────────────────────

function YearStrip({ year, getDots }: { year: number; getDots: Props['getDots'] }) {
  const dots   = useYearDots(getDots, year);
  const count  = Object.keys(dots).length;
  const offset = mondayOffset(year, 0);
  const total  = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
  const weeks  = Math.ceil((offset + total) / 7);

  // column index of the 1st of each month → month labels
  const monthCols = MONTH_SHORT.map((label, m) => {
    const dayOfYear = Math.round((new Date(year, m, 1).getTime() - new Date(year, 0, 1).getTime()) / 86400000);
    return { label, col: Math.floor((offset + dayOfYear) / 7) };
  });

  const cells: (string | null)[] = Array(offset).fill(null);
  for (let m = 0; m < 12; m++) {
    const days = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) cells.push(iso(year, m, d));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-lg font-bold text-ink leading-none">{year}</p>
        <p className="text-[11px] text-ink/40">{count} {count === 1 ? 'día' : 'días'}</p>
      </div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-[2px] pt-[13px]">
          {DAY_ROWS.map((l, i) => (
            <span key={i} className="text-[8px] leading-none text-ink/30 flex items-center">{l}</span>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative h-[11px]">
            {monthCols.map(({ label, col }) => (
              <span key={label} className="absolute text-[8px] leading-none text-ink/30"
                style={{ left: `${(col / weeks) * 100}%` }}>{label}</span>
            ))}
          </div>
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
          >
            {cells.map((date, i) => {
              const dot = date ? dots[date] : undefined;
              return (
                <span
                  key={i}
                  className="aspect-square rounded-full"
                  style={
                    !date ? undefined
                    : dot ? { backgroundColor: dot.hex, opacity: ALPHA[dot.level] }
                    : { backgroundColor: 'rgba(0,0,0,0.06)' }
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ getDots, firstYear }: Props) {
  const currentYear = Number(todayIso().slice(0, 4));
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i);
  return (
    <div className="rounded-4xl bg-white shadow-card px-4 py-5 space-y-6">
      {years.map((y) => <YearStrip key={y} year={y} getDots={getDots} />)}
    </div>
  );
}

// ── Wrapper with Mes / Año / Historial switch ────────────────────────────────

interface Props {
  getDots: (year: number, month: number) => Record<string, CalendarDot>;
  selectedDate: string;
  onSelect: (date: string) => void;
  /** Earliest year that can hold data (bounds Año navigation and Historial). */
  firstYear: number;
}

export function ProgressCalendarViews(props: Props) {
  const [view, setView] = useState<CalendarView>('mes');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">Calendario</p>
        <div className="flex rounded-2xl bg-white p-0.5 shadow-card">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`rounded-xl px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                view === v.id ? 'bg-ink text-white' : 'text-ink/40'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'mes'       && <ProgressCalendar getDots={props.getDots} selectedDate={props.selectedDate} onSelect={props.onSelect} />}
      {view === 'anio'      && <YearView {...props} />}
      {view === 'historial' && <HistoryView {...props} />}
    </div>
  );
}
