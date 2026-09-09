'use client';

import { useEffect, useState } from 'react';
import { Moon, Activity, Droplet } from 'lucide-react';
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

export function DayScoreCard({ selectedDate, onNavToProgreso }: { selectedDate: string; onNavToProgreso?: () => void }) {
  const [data, setData] = useState<DayScoreResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getJson<DayScoreResponse>(`/day-score?date=${selectedDate}`)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  if (!data || data.score == null) return null;

  const offset = CIRCUMFERENCE * (1 - data.score / 100);
  const { sleep, hrv, pain } = data.components;

  return (
    <>
      <button type="button" onClick={() => setShowDetail(true)} className="w-full text-left">
        <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/30">Estado de hoy</p>

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
                <span className="text-[9px] text-ink/30 mt-0.5">/ 100</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-ink leading-snug">{data.label}</p>
              {data.explanation && (
                <p className="text-xs text-ink/50 mt-1 leading-relaxed">{data.explanation}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-ink/5">
            <div className="flex flex-col items-center gap-1 pt-3">
              <div className="flex items-center gap-1 text-ink/30">
                <Moon size={11} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Sueño</span>
              </div>
              <span className="text-sm font-bold text-ink">
                {sleep.durationH != null ? fmtSleepH(sleep.durationH) : '--'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 pt-3">
              <div className="flex items-center gap-1 text-ink/30">
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
            <div className="flex flex-col items-center gap-1 pt-3">
              <div className="flex items-center gap-1 text-ink/30">
                <Droplet size={11} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Dolor</span>
              </div>
              <span className="text-sm font-bold text-ink">
                {pain.avgPainLevel != null ? `${pain.avgPainLevel}/10` : '--'}
              </span>
            </div>
          </div>

          {data.tip && (
            <div className="rounded-2xl bg-moss-light px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-moss/70">Hoy</p>
              <p className="text-sm text-ink/80 mt-0.5">{data.tip}</p>
            </div>
          )}
        </div>
      </button>
      {data && <DayScoreDetailSheet isOpen={showDetail} onClose={() => setShowDetail(false)} data={data} onNavToProgreso={onNavToProgreso} />}
    </>
  );
}
