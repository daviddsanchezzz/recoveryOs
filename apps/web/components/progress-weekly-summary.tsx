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

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className={`text-2xl font-bold leading-tight ${accent ? 'text-moss' : 'text-ink'}`}>{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
    </div>
  );
}

function CardActions({ onDetail, onAdd }: { onDetail?: () => void; onAdd?: () => void }) {
  if (!onDetail && !onAdd) return null;
  return (
    <div className="flex items-center justify-end gap-1.5 mt-3">
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="h-8 w-8 rounded-2xl bg-ink flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={14} className="text-white" />
        </button>
      )}
      {onDetail && (
        <button
          type="button"
          onClick={onDetail}
          className="h-8 w-8 rounded-2xl bg-ink/8 flex items-center justify-center active:scale-95 transition-transform"
        >
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
    const { totalMinutes, sessions, totalVolumeKg, distanceKm, avgHrBpm } = summary;
    const hasExtras = (totalVolumeKg != null && totalVolumeKg > 0) || (distanceKm != null && distanceKm > 0) || avgHrBpm != null;
    return (
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Tiempo total" value={fmtMinutes(totalMinutes)} />
          <Metric label="Sesiones" value={sessions === 0 ? '--' : String(sessions)} />
        </div>
        {hasExtras && (
          <div className="pt-3 border-t border-ink/6 grid grid-cols-2 gap-4">
            {totalVolumeKg != null && totalVolumeKg > 0 && (
              <Metric label="Volumen gym" value={`${totalVolumeKg.toLocaleString('es-ES')} kg`} />
            )}
            {distanceKm != null && distanceKm > 0 && (
              <Metric label="Distancia" value={`${distanceKm.toFixed(1)} km`} />
            )}
            {avgHrBpm != null && (
              <Metric label="FC media" value={`${avgHrBpm} bpm`} />
            )}
          </div>
        )}
        <CardActions onDetail={onActividadPress} onAdd={onActividadAdd} />
      </div>
    );
  }

  if (summary.tab === 'peso') {
    const { currentKg, lastEntryDate, changeVsPrev } = summary;
    const days = lastEntryDate != null ? daysSince(lastEntryDate) : null;
    const daysLabel =
      days === null    ? null
      : days === 0    ? 'Hoy'
      : days === 1    ? 'Ayer'
      : `Hace ${days} día${days > 1 ? 's' : ''}`;
    const changeColor =
      changeVsPrev == null ? 'text-ink/40'
      : changeVsPrev < 0  ? 'text-moss'
      : changeVsPrev > 0  ? 'text-ember'
      : 'text-ink/40';

    return (
      <div className="rounded-4xl bg-white shadow-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-ink leading-tight">
              {currentKg != null ? currentKg : '--'}
              <span className="text-base font-semibold text-ink/30"> kg</span>
            </p>
            {daysLabel && (
              <p className="text-xs text-ink/40 mt-1">{daysLabel}</p>
            )}
          </div>
          {changeVsPrev != null && (
            <div className="text-right">
              <p className={`text-2xl font-bold leading-tight ${changeColor}`}>
                {changeVsPrev > 0 ? '+' : ''}{changeVsPrev} kg
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mt-0.5">
                vs anterior
              </p>
            </div>
          )}
        </div>
        <CardActions onDetail={onWeightPress} onAdd={onWeightAdd} />
      </div>
    );
  }

  if (summary.tab === 'dolor') {
    const { avg, prevAvg, trend } = summary;
    const trendText  = trend === 'mejorando' ? '↓ Mejorando' : trend === 'empeorando' ? '↑ Empeorando' : trend === 'estable' ? '→ Estable' : null;
    const trendColor = trend === 'mejorando' ? 'text-moss' : trend === 'empeorando' ? 'text-red-500' : 'text-ink/40';
    return (
      <div className="rounded-4xl bg-white shadow-card p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p className="text-3xl font-bold text-ink leading-tight">
              {avg != null ? avg : '--'}
              <span className="text-base font-semibold text-ink/30">/10</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Dolor medio</p>
          </div>
          {trendText && (
            <div className="space-y-0.5">
              <p className={`text-lg font-bold leading-tight ${trendColor}`}>{trendText}</p>
              {prevAvg != null && (
                <p className="text-[11px] text-ink/40">vs {prevAvg}/10 sem. anterior</p>
              )}
            </div>
          )}
        </div>
        <CardActions onDetail={onDolorPress} onAdd={onDolorAdd} />
      </div>
    );
  }

  if (summary.tab === 'rehab') {
    const { daysCompleted, pct } = summary;
    const metGoal = pct >= 70;
    return (
      <div className="rounded-4xl bg-white shadow-card p-5 space-y-4">
        <div className="flex items-end gap-5">
          <div className="space-y-0.5">
            <p className="text-3xl font-bold text-ink leading-tight">
              {daysCompleted}
              <span className="text-base font-semibold text-ink/30">/7</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Días rehab</p>
          </div>
          <div className="space-y-0.5 pb-0.5">
            <p className={`text-2xl font-bold leading-tight ${metGoal ? 'text-moss' : 'text-ember'}`}>{pct}%</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Objetivo ≥70%</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${metGoal ? 'bg-moss' : 'bg-ember'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (summary.tab === 'sueno') {
    const { avgH, totalH, avgQuality } = summary;
    const qualityLabels = ['', 'Mala', 'Regular', 'Normal', 'Buena', 'Óptima'];
    const qualLabel = avgQuality != null ? qualityLabels[Math.round(avgQuality)] : null;
    return (
      <div className="rounded-4xl bg-white shadow-card p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p className="text-3xl font-bold text-ink leading-tight">
              {avgH != null ? avgH : '--'}
              <span className="text-base font-semibold text-ink/30">h</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Media noche</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-bold text-ink leading-tight">
              {avgQuality != null ? avgQuality.toFixed(1) : '--'}
              <span className="text-base font-semibold text-ink/30">/5</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              Calidad {qualLabel && <span className="normal-case font-normal">· {qualLabel}</span>}
            </p>
          </div>
        </div>
        {totalH != null && (
          <p className="text-sm text-ink/40 mt-3">
            Total semana: <span className="text-ink font-semibold">{totalH}h</span>
          </p>
        )}
        <CardActions onDetail={onSuenoPress} onAdd={onSuenoAdd} />
      </div>
    );
  }

  return null;
}
