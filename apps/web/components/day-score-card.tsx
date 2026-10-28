'use client';

import { useEffect, useState } from 'react';
import { Moon, Activity, Droplet, Scale, Lightbulb, Plus } from 'lucide-react';
import { getJson } from '../lib/api';
import { DayScoreDetailSheet } from './day-score-detail-sheet';

export type DayScoreResponse = {
  score: number | null;
  label: string | null;
  explanation: string | null;
  tip: string | null;
  components: {
    sleep: { score: number | null; durationH: number | null; label: string | null };
    hrv: { score: number | null; valueMs: number | null; deltaPct: number | null };
    pain: { score: number | null; avgPainLevel: number | null };
    load: { score: number | null; ratio: number | null; status: 'alta' | 'normal' | 'baja' | null };
  };
  weights: { sleep: number; hrv: number; pain: number; load: number };
};

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function fmtSleepH(h: number): string {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

/** Turns the numbers into a decision: how last night compares + what the load says + what is planned. */
function buildAdvice({
  data, isToday, sleepAvgH, plannedToday,
}: {
  data: DayScoreResponse;
  isToday: boolean;
  sleepAvgH: number | null;
  plannedToday: string[];
}): string | null {
  const parts: string[] = [];
  const sleepH = data.components.sleep.durationH;

  if (sleepH != null && sleepAvgH != null) {
    const diffMin = Math.round((sleepH - sleepAvgH) * 60);
    if (Math.abs(diffMin) >= 30) {
      const abs = Math.abs(diffMin);
      const amount = abs >= 60 ? fmtSleepH(abs / 60) : `${abs} min`;
      parts.push(`${isToday ? 'Dormiste' : 'Durmió'} ${amount} ${diffMin < 0 ? 'menos' : 'más'} que tu media.`);
    }
  }

  // The tip is phrased as advice for the day ("prioriza descanso hoy"), so it only makes sense today.
  if (isToday && data.tip) parts.push(data.tip);

  if (isToday && plannedToday.length > 0) {
    parts.push(`Hoy toca: ${plannedToday.slice(0, 2).join(' y ')}.`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

export function DayScoreCard({
  selectedDate,
  onNavToProgreso,
  hasActiveInjuries,
  todayWeightKg,
  onAddSleep,
  onAddWeight,
  onAddPain,
  isToday = true,
  sleepAvgH = null,
  plannedToday = [],
}: {
  selectedDate: string;
  onNavToProgreso?: () => void;
  hasActiveInjuries: boolean;
  todayWeightKg: number | null;
  onAddSleep: () => void;
  onAddWeight: () => void;
  onAddPain: () => void;
  isToday?: boolean;
  /** Average sleep of the previous days, to say how last night compares. */
  sleepAvgH?: number | null;
  /** Labels of the sessions planned for the day that are still pending. */
  plannedToday?: string[];
}) {
  const [data, setData] = useState<DayScoreResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Drop the previous day's score right away so it is never shown under the new date.
    setData(null);
    setStatus('loading');
    getJson<DayScoreResponse>(`/day-score?date=${selectedDate}`)
      .then((res) => { if (!cancelled) { setData(res); setStatus('ready'); } })
      .catch(() => { if (!cancelled) { setData(null); setStatus('error'); } });
    return () => { cancelled = true; };
  }, [selectedDate]);

  if (status === 'loading') {
    return (
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-4 animate-pulse" aria-busy="true">
        <div className="h-3 w-24 rounded-full bg-ink/10" />
        <div className="flex items-center gap-4">
          <div className="h-[76px] w-[76px] rounded-full bg-ink/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded-full bg-ink/10" />
            <div className="h-3 w-full rounded-full bg-ink/10" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.score == null) {
    return (
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">Estado del día</p>
        <p className="text-sm text-ink/60 leading-relaxed">
          {status === 'error'
            ? 'No he podido calcular el estado de este día. Inténtalo de nuevo en un momento.'
            : 'Todavía no hay datos suficientes para calcular el estado de este día. Registra tu sueño o conecta COROS para verlo.'}
        </p>
        {status === 'ready' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onAddSleep} className="flex items-center gap-1.5 rounded-full bg-canvas px-3 py-2 text-xs font-semibold text-ink active:scale-95 transition-transform">
              <Plus size={12} /> Sueño
            </button>
            {hasActiveInjuries && (
              <button type="button" onClick={onAddPain} className="flex items-center gap-1.5 rounded-full bg-canvas px-3 py-2 text-xs font-semibold text-ink active:scale-95 transition-transform">
                <Plus size={12} /> Dolor
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const advice = buildAdvice({ data, isToday, sleepAvgH, plannedToday });

  const offset = CIRCUMFERENCE * (1 - data.score / 100);
  const { sleep, hrv, pain } = data.components;

  return (
    <>
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
        <button type="button" onClick={() => setShowDetail(true)} className="w-full text-left space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">Estado del día</p>

          <div className="flex items-center gap-4">
            <div className="relative h-[76px] w-[76px] flex-shrink-0">
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r={RADIUS} fill="none" stroke="#13201a14" strokeWidth="8" />
                <circle
                  cx="38" cy="38" r={RADIUS} fill="none" stroke="#54715a" strokeWidth="8"
                  strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset} strokeLinecap="round"
                  transform="rotate(-90 38 38)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-ink leading-none">{data.score}</span>
                <span className="text-[9px] text-ink/50 mt-0.5">/ 100</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-ink leading-snug">{data.label}</p>
              {data.explanation && (
                <p className="text-xs text-ink/60 mt-1 leading-relaxed">{data.explanation}</p>
              )}
            </div>
          </div>

          <div className="flex items-stretch gap-2 pt-1 border-t border-ink/5">
            <div className="flex-1 flex flex-col items-center gap-1 pt-3">
              <div className="flex items-center gap-1 text-ink/50">
                <Moon size={11} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Sueño</span>
              </div>
              <span className="text-sm font-bold text-ink">
                {sleep.durationH != null ? fmtSleepH(sleep.durationH) : '--'}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 pt-3">
              <div className="flex items-center gap-1 text-ink/50">
                <Activity size={11} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">HRV</span>
              </div>
              <span className="text-sm font-bold text-ink">
                {hrv.valueMs != null ? `${hrv.valueMs} ms` : '--'}
              </span>
              {hrv.deltaPct != null && (
                <span className={`text-[10px] font-medium ${hrv.deltaPct < 0 ? 'text-ember' : 'text-moss'}`}>
                  {hrv.deltaPct > 0 ? '↑' : '↓'} {Math.abs(hrv.deltaPct)}%
                </span>
              )}
            </div>
            {hasActiveInjuries && (
              <div className="flex-1 flex flex-col items-center gap-1 pt-3">
                <div className="flex items-center gap-1 text-ink/50">
                  <Droplet size={11} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">Dolor</span>
                </div>
                <span className="text-sm font-bold text-ink">
                  {pain.avgPainLevel != null ? `${pain.avgPainLevel}/10` : '--'}
                </span>
              </div>
            )}
            {todayWeightKg != null && (
              <div className="flex-1 flex flex-col items-center gap-1 pt-3">
                <div className="flex items-center gap-1 text-ink/50">
                  <Scale size={11} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide">Peso</span>
                </div>
                <span className="text-sm font-bold text-ink">{todayWeightKg.toFixed(1)} kg</span>
              </div>
            )}
          </div>

        </button>

        {advice && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-moss-light px-3.5 py-3">
            <Lightbulb size={15} className="mt-0.5 flex-shrink-0 text-moss" />
            <p className="text-[13px] leading-snug text-ink/80">{advice}</p>
          </div>
        )}
      </div>
      <DayScoreDetailSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        data={data}
        onNavToProgreso={onNavToProgreso}
        hasActiveInjuries={hasActiveInjuries}
        todayWeightKg={todayWeightKg}
        onAddSleep={onAddSleep}
        onAddWeight={onAddWeight}
        onAddPain={onAddPain}
      />
    </>
  );
}
