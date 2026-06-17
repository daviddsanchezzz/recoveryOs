'use client';

import { Panel, Card } from './ui/card';
import { useRecoveryStore } from '../stores/recovery-store';
import {
  calculateCheckInStreak,
  calculateRehabAdherence,
  calculateWeightTrend,
  weeklyActivityStats,
  weeklyPainAverage,
} from '../lib/metrics';

export function ProgressScreen() {
  const { weightEntries, activities, injuries, injuryLogs, checkIns } = useRecoveryStore();
  const weightTrend = calculateWeightTrend(weightEntries);
  const weeklyActivity = weeklyActivityStats(activities);
  const rehabAdherence = calculateRehabAdherence(checkIns);
  const streak = calculateCheckInStreak(checkIns);
  const painAverage = weeklyPainAverage(injuries, injuryLogs);

  const latestWeights = [...weightEntries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  const maxWeight = latestWeights.reduce((max, entry) => Math.max(max, entry.weightKg), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Racha de check-ins"
          value={`${streak} dias`}
          subtitle="Constancia actual"
        />
        <Card
          title="Cambio semanal"
          value={weightTrend.weeklyChange !== null ? `${weightTrend.weeklyChange} kg` : '--'}
          subtitle="Promedio 7d vs 7d previos"
        />
        <Card
          title="Actividad semanal"
          value={`${weeklyActivity.totalMinutes} min`}
          subtitle={`${weeklyActivity.totalSessions} sesiones`}
        />
        <Card
          title="Rehab adherence"
          value={`${rehabAdherence}%`}
          subtitle="Objetivo: 5 dias o mas"
        />
      </div>

      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Peso</p>
        <h3 className="text-2xl font-semibold">Tendencia simple</h3>
        <div className="flex items-end gap-3 rounded-3xl bg-canvas p-4">
          {latestWeights.length > 0 ? (
            latestWeights.map((entry) => (
              <div key={entry.id} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-ink/85"
                  style={{
                    height: `${Math.max(24, (entry.weightKg / maxWeight) * 150)}px`,
                  }}
                />
                <span className="text-[11px] text-ink/60">{entry.date.slice(8, 10)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink/60">Aun no hay suficientes pesos para el grafico.</p>
          )}
        </div>
      </Panel>

      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Lesiones activas</p>
        <h3 className="text-2xl font-semibold">Dolor medio y rehab</h3>
        <div className="grid gap-3">
          {injuries
            .filter((injury) => injury.status !== 'resolved')
            .map((injury) => {
              const logs = injuryLogs.filter((log) => log.injuryId === injury.id);
              const average =
                logs.length > 0
                  ? Number((logs.reduce((sum, log) => sum + log.painLevel, 0) / logs.length).toFixed(1))
                  : null;
              return (
                <div key={injury.id} className="rounded-2xl bg-canvas p-4 text-sm text-ink/78">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{injury.name}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs capitalize">
                      {injury.status}
                    </span>
                  </div>
                  <p className="mt-2">Dolor medio: {average !== null ? `${average}/10` : '--'}</p>
                  <p className="mt-1">Body part: {injury.bodyPart ?? 'sin definir'}</p>
                </div>
              );
            })}
        </div>
        {painAverage !== null ? (
          <p className="text-sm text-ink/72">Dolor medio total de lesiones activas: {painAverage}/10</p>
        ) : null}
      </Panel>
    </div>
  );
}

