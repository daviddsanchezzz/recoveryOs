'use client';

import { Plus, ChevronRight } from 'lucide-react';
import { todayIso } from '../lib/date';
import type { WeeklySummary } from '../lib/progress-metrics';

function daysSince(date: string): number {
  const today = new Date(todayIso() + 'T12:00:00');
  const d     = new Date(date + 'T12:00:00');
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

function fmtMinutes(v: number): string {
  if (v === 0) return '--';
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// Small inline delta badge — green when good, red when bad
function Delta({ value, suffix, lowerIsBetter = false }: { value: number; suffix: string; lowerIsBetter?: boolean }) {
  if (value === 0) return null;
  const isGood = lowerIsBetter ? value < 0 : value > 0;
  const sign   = value > 0 ? '+' : '';
  return (
    <span className={`text-xs font-semibold leading-none ${isGood ? 'text-moss' : 'text-red-500'}`}>
      {sign}{value}{suffix}
    </span>
  );
}

function CardActions({ onDetail, onAdd }: { onDetail?: () => void; onAdd?: () => void }) {
  if (!onDetail && !onAdd) return null;
  return (
    <div className="flex items-center justify-end gap-1.5 mt-3">
      {onAdd && (
        <button type="button" onClick={onAdd} className="h-8 w-8 rounded-2xl bg-ink flex items-center justify-center active:scale-95 transition-transform">
          <Plus size={14} className="text-white" />
        </button>
      )}
      {onDetail && (
        <button type="button" onClick={onDetail} className="h-8 w-8 rounded-2xl bg-ink/8 flex items-center justify-center active:scale-95 transition-transform">
          <ChevronRight size={14} className="text-ink/40" />
        </button>
      )}
    </div>
  );
}

interface Props {
  summary: WeeklySummary;
  onWeightPress?: () => void;
  onDolorPress?: () => void;
  onSuenoPress?: () => void;
  onWeightAdd?: () => void;
  onDolorAdd?: () => void;
  onSuenoAdd?: () => void;
  onActividadPress?: () => void;
  onActividadAdd?: () => void;
}

export function ProgressWeeklySummary({
  summary,
  onWeightPress, onDolorPress, onSuenoPress,
  onWeightAdd, onDolorAdd, onSuenoAdd,
  onActividadPress, onActividadAdd,
}: Props) {

  if (summary.tab === 'actividad') {
    const { totalMinutes, sessions, totalVolumeKg, distanceKm, avgHrBpm, prevTotalMinutes, prevSessions } = summary;
    const hasExtras     = (totalVolumeKg != null && totalVolumeKg > 0) || (distanceKm != null && distanceKm > 0) || avgHrBpm != null;
    const timePct       = prevTotalMinutes > 0 ? Math.round(((totalMinutes - prevTotalMinutes) / prevTotalMinutes) * 100) : null;
    const timeMinDiff   = prevTotalMinutes > 0 ? totalMinutes - prevTotalMinutes : null;
    const sessionsDelta = sessions - prevSessions;

    // Volume display: convert to tonnes when ≥ 1000 kg to avoid "17.807 kg" confusion
    const fmtVol = (kg: number) => kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;

    return (
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
        {/* Primary — time hero + % comparison on the right */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl font-bold text-ink leading-tight">{fmtMinutes(totalMinutes)}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mt-0.5">Tiempo total</p>
          </div>
          {timePct !== null && timePct !== 0 && (
            <div className="text-right flex-shrink-0">
              <p className={`text-2xl font-bold leading-tight ${timePct > 0 ? 'text-moss' : 'text-ember'}`}>
                {timePct > 0 ? '+' : ''}{timePct}%
              </p>
              <p className="text-[10px] text-ink/35 font-medium mt-0.5">vs sem. ant.</p>
            </div>
          )}
        </div>

        {/* Secondary — sessions + absolute time diff */}
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-ink">{sessions === 0 ? '--' : sessions}</span>
          <span className="text-sm text-ink/40">sesion{sessions !== 1 ? 'es' : ''}</span>
          {sessionsDelta !== 0 && (prevSessions > 0 || sessions > 0) && (
            <span className={`text-xs font-semibold ${sessionsDelta > 0 ? 'text-moss' : 'text-ember'}`}>
              {sessionsDelta > 0 ? '+' : ''}{sessionsDelta}
            </span>
          )}
          {timeMinDiff !== null && timeMinDiff !== 0 && (
            <span className="text-xs text-ink/30 ml-1">
              · {timeMinDiff > 0 ? '+' : ''}{fmtMinutes(Math.abs(timeMinDiff))}
            </span>
          )}
        </div>

        {/* Tertiary — volume / distance / HR as compact inline chips */}
        {hasExtras && (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-3 border-t border-ink/6">
            {totalVolumeKg != null && totalVolumeKg > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-ink">{fmtVol(totalVolumeKg)}</span>
                <span className="text-[11px] text-ink/40">volumen</span>
              </div>
            )}
            {distanceKm != null && distanceKm > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-ink">{distanceKm.toFixed(1)} km</span>
                <span className="text-[11px] text-ink/40">distancia</span>
              </div>
            )}
            {avgHrBpm != null && (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-ink">{avgHrBpm}</span>
                <span className="text-[11px] text-ink/40">bpm FC</span>
              </div>
            )}
          </div>
        )}
        <CardActions onDetail={onActividadPress} onAdd={onActividadAdd} />
      </div>
    );
  }

  if (summary.tab === 'peso') {
    const { currentKg, lastEntryDate, weekChangeKg, monthChangeKg } = summary;
    const days = lastEntryDate != null ? daysSince(lastEntryDate) : null;
    const daysLabel = days === null ? null : days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} día${days > 1 ? 's' : ''}`;
    const primaryDelta  = weekChangeKg;
    const primaryLabel  = 'esta sem.';
    const secondaryDelta = weekChangeKg !== null ? monthChangeKg : null;
    const secondaryLabel = 'este mes';

    return (
      <div className="rounded-4xl bg-white shadow-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-ink leading-tight">
              {currentKg != null ? currentKg : '--'}
              <span className="text-base font-semibold text-ink/30"> kg</span>
            </p>
            {daysLabel && <p className="text-xs text-ink/40 mt-1">{daysLabel}</p>}
          </div>
          <div className="text-right space-y-1">
            {primaryDelta !== null && primaryDelta !== 0 && (
              <div>
                <p className={`text-2xl font-bold leading-tight ${primaryDelta > 0 ? 'text-ember' : 'text-moss'}`}>
                  {primaryDelta > 0 ? '+' : ''}{primaryDelta} kg
                </p>
                <p className="text-[10px] text-ink/40 mt-0.5">{primaryLabel}</p>
              </div>
            )}
          </div>
        </div>
        {secondaryDelta !== null && secondaryDelta !== 0 && (
          <p className="text-xs text-ink/40 mt-2">
            {secondaryLabel}:{' '}
            <span className={`font-semibold ${secondaryDelta <= 0 ? 'text-moss' : 'text-ember'}`}>
              {secondaryDelta > 0 ? '+' : ''}{secondaryDelta} kg
            </span>
          </p>
        )}
        <CardActions onDetail={onWeightPress} onAdd={onWeightAdd} />
      </div>
    );
  }

  if (summary.tab === 'lesion') {
    const { avg, prevAvg, trend, deltaPoints, daysCompleted, pct, prevDaysCompleted } = summary;
    const trendText  = trend === 'mejorando' ? '↓ Mejorando' : trend === 'empeorando' ? '↑ Empeorando' : trend === 'estable' ? '→ Estable' : null;
    const trendColor = trend === 'mejorando' ? 'text-moss' : trend === 'empeorando' ? 'text-red-500' : 'text-ink/40';
    const metGoal    = pct >= 70;
    const daysDelta  = daysCompleted - prevDaysCompleted;
    return (
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
        {/* Dolor row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold text-ink leading-tight">
                {avg != null ? avg : '--'}
                <span className="text-base font-semibold text-ink/30">/10</span>
              </p>
              {deltaPoints !== null && <Delta value={deltaPoints} suffix=" pts" lowerIsBetter />}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Dolor medio</p>
          </div>
          {trendText && (
            <div className="space-y-0.5">
              <p className={`text-lg font-bold leading-tight ${trendColor}`}>{trendText}</p>
              {prevAvg != null && <p className="text-[11px] text-ink/40">vs {prevAvg}/10 sem. ant.</p>}
            </div>
          )}
        </div>

        {/* Rehab row */}
        <div className="pt-3 border-t border-ink/6 space-y-2">
          <div className="flex items-end justify-between">
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-bold text-ink leading-tight">
                  {daysCompleted}
                  <span className="text-sm font-semibold text-ink/30">/7 días</span>
                </p>
                {daysDelta !== 0 && prevDaysCompleted >= 0 && <Delta value={daysDelta} suffix=" días" />}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Rehab</p>
            </div>
            <p className={`text-xl font-bold pb-0.5 ${metGoal ? 'text-moss' : 'text-ember'}`}>{pct}%</p>
          </div>
          <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${metGoal ? 'bg-moss' : 'bg-ember'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <CardActions onDetail={onDolorPress} onAdd={onDolorAdd} />
      </div>
    );
  }

  if (summary.tab === 'sueno') {
    const { avgH, totalH, avgQuality, prevAvgH, prevAvgQuality } = summary;
    const qualityLabels = ['', 'Mala', 'Regular', 'Normal', 'Buena', 'Óptima'];
    const qualLabel  = avgQuality != null ? qualityLabels[Math.round(avgQuality)] : null;
    const deltaMinH  = avgH != null && prevAvgH != null ? Math.round((avgH - prevAvgH) * 60) : null;
    const deltaQual  = avgQuality != null && prevAvgQuality != null ? Number((avgQuality - prevAvgQuality).toFixed(1)) : null;
    return (
      <div className="rounded-4xl bg-white shadow-card p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold text-ink leading-tight">
                {avgH != null ? avgH : '--'}
                <span className="text-base font-semibold text-ink/30">h</span>
              </p>
              {deltaMinH !== null && deltaMinH !== 0 && <Delta value={deltaMinH} suffix="min" />}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Media noche</p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-ink leading-tight">
                {avgQuality != null ? avgQuality.toFixed(1) : '--'}
                <span className="text-base font-semibold text-ink/30">/5</span>
              </p>
              {deltaQual !== null && deltaQual !== 0 && <Delta value={deltaQual} suffix="" />}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              Calidad {qualLabel && <span className="normal-case font-normal">· {qualLabel}</span>}
            </p>
          </div>
        </div>
        {totalH != null && (
          <p className="text-sm text-ink/40 mt-3">Total semana: <span className="text-ink font-semibold">{totalH}h</span></p>
        )}
        <CardActions onDetail={onSuenoPress} onAdd={onSuenoAdd} />
      </div>
    );
  }

  return null;
}
