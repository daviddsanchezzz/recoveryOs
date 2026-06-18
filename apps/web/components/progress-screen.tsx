'use client';

import { useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Activity, Heart, ChevronRight } from 'lucide-react';
import { useRecoveryStore } from '../stores/recovery-store';
import { WeightLineChart } from './weight-line-chart';
import { WeightScreen } from './weight-screen';
import {
  calculateCheckInStreak,
  calculateRehabAdherence,
  calculateWeightTrend,
  weeklyActivityStats,
  weeklyPainAverage,
} from '../lib/metrics';

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'down' ? 'text-moss' : trend === 'up' ? 'text-ember' : 'text-ink/30';

  return (
    <div className="rounded-3xl bg-white shadow-card p-4 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-ink leading-tight">{value}</p>
        {trend && <TrendIcon size={16} className={`mb-0.5 flex-shrink-0 ${trendColor}`} />}
      </div>
      {sub && <p className="text-xs text-ink/40">{sub}</p>}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-1">{label}</p>
  );
}

export function ProgressScreen() {
  const [showWeightScreen, setShowWeightScreen] = useState(false);

  const { weightEntries, activities, injuries, injuryLogs, checkIns } = useRecoveryStore();
  const weightTrend    = calculateWeightTrend(weightEntries);
  const weeklyActivity = weeklyActivityStats(activities);
  const rehabAdherence = calculateRehabAdherence(checkIns);
  const streak         = calculateCheckInStreak(checkIns);
  const painAverage    = weeklyPainAverage(injuries, injuryLogs);

  const sortedWeights = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const chartEntries  = sortedWeights.slice(-14);
  const latestId      = sortedWeights[sortedWeights.length - 1]?.id;

  const trendDir = weightTrend.weeklyChange !== null
    ? weightTrend.weeklyChange < 0 ? 'down' : weightTrend.weeklyChange > 0 ? 'up' : 'neutral'
    : 'neutral';

  return (
    <>
    <div className="px-4 pt-4 pb-4 space-y-5 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">Progreso</h1>
        <p className="text-sm text-ink/40">Evolución semanal</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Racha"
          value={`${streak}d`}
          sub="check-ins seguidos"
          trend="neutral"
        />
        <StatCard
          label="Peso"
          value={weightTrend.weeklyChange !== null ? `${weightTrend.weeklyChange > 0 ? '+' : ''}${weightTrend.weeklyChange} kg` : '--'}
          sub="esta semana"
          trend={trendDir}
        />
        <StatCard
          label="Actividad"
          value={`${weeklyActivity.totalMinutes}m`}
          sub={`${weeklyActivity.totalSessions} sesiones`}
        />
        <StatCard
          label="Rehab"
          value={`${rehabAdherence}%`}
          sub="objetivo: ≥70%"
          trend={rehabAdherence >= 70 ? 'down' : 'up'}
        />
      </div>

      {/* Weight Chart — tap to open full weight screen */}
      <div className="space-y-2">
        <SectionHeader label="Peso — evolución" />
        <button
          type="button"
          onClick={() => setShowWeightScreen(true)}
          className="w-full rounded-4xl bg-white shadow-card px-5 pt-5 pb-4 text-left active:scale-[0.99] transition-transform"
        >
          {chartEntries.length >= 2 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink/30">
                  Últimas {chartEntries.length} entradas
                </p>
                <ChevronRight size={14} className="text-ink/25" />
              </div>
              <WeightLineChart entries={chartEntries} latestId={latestId} height={120} />
            </div>
          ) : (
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-ink/20" />
                <p className="text-sm text-ink/30">Registra pesos para ver la evolución</p>
              </div>
              <ChevronRight size={14} className="text-ink/25" />
            </div>
          )}
        </button>
      </div>

      {/* Injury Tracking */}
      <div className="space-y-2">
        <SectionHeader label="Lesiones activas" />
        <div className="space-y-3">
          {injuries.filter((i) => i.status !== 'resolved').length === 0 ? (
            <div className="rounded-3xl bg-white shadow-card p-5 flex items-center gap-3">
              <Heart size={20} className="text-moss" />
              <p className="text-sm text-ink/60">Sin lesiones activas registradas</p>
            </div>
          ) : (
            injuries
              .filter((i) => i.status !== 'resolved')
              .map((injury) => {
                const logs = injuryLogs.filter((l) => l.injuryId === injury.id);
                const average = logs.length > 0
                  ? Number((logs.reduce((s, l) => s + l.painLevel, 0) / logs.length).toFixed(1))
                  : null;
                const painColor = average === null ? 'text-ink/30' : average <= 3 ? 'text-moss' : average <= 6 ? 'text-ember' : 'text-red-500';
                const pct = average !== null ? (average / 10) * 100 : 0;
                const barColor = average === null ? 'bg-canvas' : average <= 3 ? 'bg-moss' : average <= 6 ? 'bg-ember' : 'bg-red-400';

                return (
                  <div key={injury.id} className="rounded-3xl bg-white shadow-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink text-sm">{injury.name}</p>
                        <p className="text-xs text-ink/40 mt-0.5 capitalize">
                          {injury.bodyPart ?? 'sin zona'} · {injury.status}
                        </p>
                      </div>
                      <span className={`text-2xl font-bold ${painColor}`}>
                        {average !== null ? `${average}` : '--'}
                        <span className="text-xs font-normal text-ink/30">/10</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-ink/30">
                        <span>Dolor medio</span>
                        <span>{logs.length} registros</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Weekly Rehab Adherence Bar */}
      {painAverage !== null && (
        <div className="rounded-4xl bg-canvas-light border border-sand/50 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Dolor medio total</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-sand/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-ember transition-all duration-700"
                style={{ width: `${(painAverage / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-ember">{painAverage}/10</span>
          </div>
        </div>
      )}
    </div>

      {showWeightScreen && (
        <WeightScreen onClose={() => setShowWeightScreen(false)} />
      )}
    </>
  );
}
