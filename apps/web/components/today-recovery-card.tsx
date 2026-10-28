'use client';

import { HeartPulse, Heart, Gauge } from 'lucide-react';
import type { DailyHealthMetricEntry } from '../stores/recovery-store';

export type RecoveryBaseline = { hrv: number | null; restingHeartRate: number | null; stressAvg: number | null };

const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

/** Average of the 7 days before `date`, from the health metrics we already have. */
export function computeRecoveryBaseline(
  metrics: DailyHealthMetricEntry[],
  date: string,
  daysBefore: string[],
): RecoveryBaseline {
  const rows = metrics.filter((m) => daysBefore.includes(m.date) && m.date !== date);
  const pick = (key: 'hrv' | 'restingHeartRate' | 'stressAvg') =>
    avg(rows.map((r) => r[key]).filter((v): v is number => v != null));
  return { hrv: pick('hrv'), restingHeartRate: pick('restingHeartRate'), stressAvg: pick('stressAvg') };
}

function Delta({ value, baseline, higherIsBetter, unit }: {
  value: number; baseline: number | null; higherIsBetter: boolean; unit: string;
}) {
  if (baseline == null) return <p className="text-[11px] text-ink/40">sin media aún</p>;
  const diff = Math.round(value - baseline);
  if (diff === 0) return <p className="text-[11px] text-ink/60">= tu media</p>;
  const good = higherIsBetter ? diff > 0 : diff < 0;
  return (
    <p className={`text-[11px] font-medium ${good ? 'text-moss' : 'text-ember'}`}>
      {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}{unit} vs tu media
    </p>
  );
}

export function TodayRecoveryCard({
  hrv, restingHeartRate, stressAvg, baseline,
}: {
  hrv: number | null | undefined;
  restingHeartRate: number | null | undefined;
  stressAvg: number | null | undefined;
  baseline: RecoveryBaseline;
}) {
  const items = [
    hrv != null && { key: 'hrv', Icon: HeartPulse, value: hrv, label: 'HRV (ms)', delta: <Delta value={hrv} baseline={baseline.hrv} higherIsBetter unit=" ms" /> },
    restingHeartRate != null && { key: 'rhr', Icon: Heart, value: restingHeartRate, label: 'FC reposo', delta: <Delta value={restingHeartRate} baseline={baseline.restingHeartRate} higherIsBetter={false} unit=" bpm" /> },
    stressAvg != null && { key: 'stress', Icon: Gauge, value: stressAvg, label: 'Estrés', delta: <Delta value={stressAvg} baseline={baseline.stressAvg} higherIsBetter={false} unit="" /> },
  ].filter(Boolean) as { key: string; Icon: React.ElementType; value: number; label: string; delta: React.ReactNode }[];

  if (items.length === 0) return null;

  return (
    <div className="rounded-4xl bg-white shadow-card p-5 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">Recuperación</p>
      <div className="flex items-start justify-between gap-2">
        {items.map(({ key, Icon, value, label, delta }) => (
          <div key={key} className="flex-1 flex flex-col items-center gap-1.5 text-center">
            <div className="h-9 w-9 rounded-xl bg-canvas flex items-center justify-center">
              <Icon size={15} className="text-ink/60" />
            </div>
            <p className="text-lg font-bold text-ink leading-none">{value}</p>
            <p className="text-[11px] text-ink/60 leading-none">{label}</p>
            {delta}
          </div>
        ))}
      </div>
    </div>
  );
}
