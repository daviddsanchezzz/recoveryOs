'use client';

import { Panel } from './ui/card';
import { useRecoveryStore } from '../stores/recovery-store';
import { buildRuleBasedInsight, calculateRecoveryScore, calculateRehabAdherence, weeklyActivityStats } from '../lib/metrics';
import { todayIso, sameDay } from '../lib/date';

export function InsightsScreen() {
  const { injuries, injuryLogs, checkIns, weightEntries, activities } = useRecoveryStore();
  const todayCheckIn = checkIns.find((entry) => sameDay(entry.date, todayIso()));
  const todayActivities = activities.filter((entry) => sameDay(entry.date, todayIso()));
  const recoveryScore = calculateRecoveryScore({
    activeInjuries: injuries,
    injuryLogs,
    todayCheckIn,
    todayActivities,
  });
  const insight = buildRuleBasedInsight({
    activeInjuries: injuries,
    injuryLogs,
    checkIns,
    weights: weightEntries,
  });
  const rehabAdherence = calculateRehabAdherence(checkIns);
  const activity = weeklyActivityStats(activities);

  return (
    <div className="space-y-5">
      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Insights</p>
        <h3 className="text-3xl font-semibold text-ink">Reglas simples, utilidad diaria</h3>
        <p className="text-sm leading-7 text-ink/78">{insight}</p>
      </Panel>

      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Resumen semanal</p>
        <div className="grid gap-3">
          <div className="rounded-2xl bg-canvas p-4 text-sm text-ink/78">
            Recovery score actual: <span className="font-medium text-ink">{recoveryScore}/100</span>
          </div>
          <div className="rounded-2xl bg-canvas p-4 text-sm text-ink/78">
            Adherencia rehab: <span className="font-medium text-ink">{rehabAdherence}%</span>
          </div>
          <div className="rounded-2xl bg-canvas p-4 text-sm text-ink/78">
            Actividad semanal: <span className="font-medium text-ink">{activity.totalMinutes} min</span>
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4 rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Integraciones futuras</p>
        <div className="grid gap-3">
          {['Strava', 'Coros', 'OpenAI'].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl bg-canvas p-4 text-sm">
              <span className="text-ink">{item}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-ink/60">proximamente</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

