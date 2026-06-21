'use client';

import { Plus, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { todayIso } from '../lib/date';
import type { WeeklySummary } from '../lib/progress-metrics';

function daysSince(date: string): number {
  const today = new Date(todayIso() + 'T12:00:00');
  const d     = new Date(date + 'T12:00:00');
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

function fmtMinutes(v: number): string {
  if (v === 0) return '0h';
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function fmtHours(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return mm === 0 ? `${hh}h` : `${hh}h ${mm}min`;
}

function Chip({ value, suffix = '', lowerIsBetter = false }: { value: number; suffix?: string; lowerIsBetter?: boolean }) {
  if (value === 0) return null;
  const good = lowerIsBetter ? value < 0 : value > 0;
  const sign = value > 0 ? '+' : '';
  const Icon = good ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${good ? 'text-moss' : 'text-ember'}`}>
      <Icon size={11} strokeWidth={2.5} />
      {sign}{value}{suffix}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-bold text-ink">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/35">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-ink/8 self-center" />;
}

function Actions({ onDetail, onAdd }: { onDetail?: () => void; onAdd?: () => void }) {
  if (!onDetail && !onAdd) return null;
  return (
    <div className="flex items-center justify-end gap-1.5 pt-1">
      {onAdd && (
        <button type="button" onClick={onAdd}
          className="h-8 w-8 rounded-2xl bg-ink flex items-center justify-center active:scale-95 transition-transform">
          <Plus size={14} className="text-white" />
        </button>
      )}
      {onDetail && (
        <button type="button" onClick={onDetail}
          className="h-8 w-8 rounded-2xl bg-ink/6 flex items-center justify-center active:scale-95 transition-transform">
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

  // ── Actividad ──────────────────────────────────────────────────────────────
  if (summary.tab === 'actividad') {
    const { totalMinutes, sessions, totalVolumeKg, distanceKm, avgHrBpm, prevTotalMinutes, prevSessions } = summary;
    const pct = prevTotalMinutes > 0 ? Math.round(((totalMinutes - prevTotalMinutes) / prevTotalMinutes) * 100) : null;
    const sessionsDelta = prevSessions > 0 || sessions > 0 ? sessions - prevSessions : null;
    const fmtVol = (kg: number) => kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
    const hasStats = (distanceKm != null && distanceKm > 0) || (totalVolumeKg != null && totalVolumeKg > 0) || avgHrBpm != null;

    return (
      <div className="rounded-4xl bg-white shadow-card px-5 pt-5 pb-4 space-y-4">
        {/* Hero row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-4xl font-black text-ink tracking-tight leading-none">
              {fmtMinutes(totalMinutes)}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-ink/50">
                <span className="font-bold text-ink">{sessions === 0 ? '0' : sessions}</span>
                {' '}sesion{sessions !== 1 ? 'es' : ''}
              </span>
              {sessionsDelta !== null && <Chip value={sessionsDelta} />}
            </div>
          </div>
          {pct !== null && (
            <div className={`flex flex-col items-end flex-shrink-0 rounded-2xl px-3 py-2 ${pct > 0 ? 'bg-moss/10' : pct < 0 ? 'bg-ember/10' : 'bg-ink/5'}`}>
              <span className={`text-xl font-black leading-none ${pct > 0 ? 'text-moss' : pct < 0 ? 'text-ember' : 'text-ink/40'}`}>
                {pct > 0 ? '+' : ''}{pct}%
              </span>
              <span className="text-[10px] text-ink/40 font-medium mt-0.5">vs sem. ant.</span>
            </div>
          )}
        </div>

        {/* Secondary stats */}
        {hasStats && (
          <div className="flex items-center gap-4 pt-3 border-t border-ink/5">
            {distanceKm != null && distanceKm > 0 && (
              <>
                <StatPill label="Distancia" value={`${distanceKm.toFixed(1)} km`} />
                <Divider />
              </>
            )}
            {totalVolumeKg != null && totalVolumeKg > 0 && (
              <>
                <StatPill label="Volumen" value={fmtVol(totalVolumeKg)} />
                <Divider />
              </>
            )}
            {avgHrBpm != null && (
              <StatPill label="FC media" value={`${avgHrBpm} bpm`} />
            )}
            <div className="flex-1" />
            <Actions onDetail={onActividadPress} onAdd={onActividadAdd} />
          </div>
        )}
        {!hasStats && <Actions onDetail={onActividadPress} onAdd={onActividadAdd} />}
      </div>
    );
  }

  // ── Peso ───────────────────────────────────────────────────────────────────
  if (summary.tab === 'peso') {
    const { currentKg, lastEntryDate, weekChangeKg, monthChangeKg } = summary;
    const days = lastEntryDate != null ? daysSince(lastEntryDate) : null;
    const daysLabel = days === null ? null : days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days}d`;

    return (
      <div className="rounded-4xl bg-white shadow-card px-5 pt-5 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-4xl font-black text-ink tracking-tight leading-none">
              {currentKg != null ? currentKg.toFixed(1) : '--'}
              <span className="text-lg font-semibold text-ink/30 ml-1">kg</span>
            </p>
            {daysLabel && <p className="text-sm text-ink/40 pt-1">{daysLabel}</p>}
          </div>
          {weekChangeKg !== null && weekChangeKg !== 0 && (
            <div className={`flex flex-col items-end flex-shrink-0 rounded-2xl px-3 py-2 ${weekChangeKg < 0 ? 'bg-moss/10' : 'bg-ember/10'}`}>
              <span className={`text-xl font-black leading-none ${weekChangeKg < 0 ? 'text-moss' : 'text-ember'}`}>
                {weekChangeKg > 0 ? '+' : ''}{weekChangeKg} kg
              </span>
              <span className="text-[10px] text-ink/40 font-medium mt-0.5">esta sem.</span>
            </div>
          )}
        </div>

        <div className="flex items-center pt-3 border-t border-ink/5">
          {monthChangeKg !== null && monthChangeKg !== 0 && (
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs text-ink/40">Este mes</span>
              <Chip value={monthChangeKg} suffix=" kg" lowerIsBetter />
            </div>
          )}
          <div className={monthChangeKg !== null && monthChangeKg !== 0 ? '' : 'flex-1'} />
          <Actions onDetail={onWeightPress} onAdd={onWeightAdd} />
        </div>
      </div>
    );
  }

  // ── Lesión ─────────────────────────────────────────────────────────────────
  if (summary.tab === 'lesion') {
    const { avg, trend, daysCompleted, pct } = summary;
    const metGoal = pct >= 70;
    const trendIcon = trend === 'mejorando' ? <TrendingDown size={14} className="text-moss" /> :
                      trend === 'empeorando' ? <TrendingUp size={14} className="text-ember" /> :
                      trend === 'estable' ? <Minus size={14} className="text-ink/40" /> : null;
    const trendColor = trend === 'mejorando' ? 'text-moss' : trend === 'empeorando' ? 'text-ember' : 'text-ink/40';

    return (
      <div className="rounded-4xl bg-white shadow-card px-5 pt-5 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-4xl font-black text-ink tracking-tight leading-none">
              {avg != null ? avg : '--'}
              <span className="text-lg font-semibold text-ink/30 ml-0.5">/10</span>
            </p>
            <p className="text-sm text-ink/40 pt-1">Dolor medio</p>
          </div>
          {trendIcon && (
            <div className={`flex items-center gap-1 flex-shrink-0 rounded-2xl px-3 py-2 bg-ink/5`}>
              {trendIcon}
              <span className={`text-sm font-bold ${trendColor}`}>
                {trend === 'mejorando' ? 'Mejorando' : trend === 'empeorando' ? 'Empeorando' : 'Estable'}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-ink/5">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-ink">{daysCompleted}<span className="text-ink/30">/7</span></span>
              <span className="text-xs text-ink/40">días rehab</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${metGoal ? 'text-moss' : 'text-ember'}`}>{pct}%</span>
              <Actions onDetail={onDolorPress} onAdd={onDolorAdd} />
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${metGoal ? 'bg-moss' : 'bg-ember'}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Sueño ──────────────────────────────────────────────────────────────────
  if (summary.tab === 'sueno') {
    const { avgH, totalH, avgQuality, prevAvgH, prevAvgQuality } = summary;
    const qualityLabels = ['', 'Mala', 'Regular', 'Normal', 'Buena', 'Óptima'];
    const qualLabel = avgQuality != null ? qualityLabels[Math.round(avgQuality)] ?? null : null;
    const deltaMinH = avgH != null && prevAvgH != null ? Math.round((avgH - prevAvgH) * 60) : null;
    const deltaQual = avgQuality != null && prevAvgQuality != null
      ? Number((avgQuality - prevAvgQuality).toFixed(1)) : null;

    return (
      <div className="rounded-4xl bg-white shadow-card px-5 pt-5 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-4xl font-black text-ink tracking-tight leading-none">
              {avgH != null ? fmtHours(avgH) : '--'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-ink/40">Media noche</span>
              {deltaMinH !== null && deltaMinH !== 0 && <Chip value={deltaMinH} suffix="min" />}
            </div>
          </div>
          {avgQuality != null && (
            <div className="flex flex-col items-end flex-shrink-0 rounded-2xl px-3 py-2 bg-ink/5">
              <span className="text-xl font-black leading-none text-ink">
                {avgQuality.toFixed(1)}
                <span className="text-sm font-semibold text-ink/30">/5</span>
              </span>
              <span className="text-[10px] text-ink/40 font-medium mt-0.5">{qualLabel ?? 'Calidad'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center pt-3 border-t border-ink/5">
          {totalH != null && (
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs text-ink/40">Total semana</span>
              <span className="text-sm font-bold text-ink">{fmtHours(totalH)}</span>
              {deltaQual !== null && deltaQual !== 0 && <Chip value={deltaQual} suffix=" cal." />}
            </div>
          )}
          <div className={totalH != null ? '' : 'flex-1'} />
          <Actions onDetail={onSuenoPress} onAdd={onSuenoAdd} />
        </div>
      </div>
    );
  }

  return null;
}
