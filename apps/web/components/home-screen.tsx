'use client';

import { Panel, Card } from './ui/card';
import { WeeklyCalendar } from './weekly-calendar';
import { DailyCheckInPanel } from './daily-checkin-panel';
import { useRecoveryStore } from '../stores/recovery-store';
import {
  buildRuleBasedInsight,
  calculateRecoveryScore,
  calculateRehabAdherence,
  calculateWeightTrend,
  weeklyActivityStats,
  weeklyPainAverage,
} from '../lib/metrics';
import { formatShortDate, sameDay, todayIso } from '../lib/date';
import { useSessionStore } from '../stores/session-store';

export function HomeScreen() {
  const user = useSessionStore((state) => state.user);
  const {
    selectedDate,
    setSelectedDate,
    checkIns,
    weightEntries,
    activities,
    injuryLogs,
    injuries,
  } = useRecoveryStore();

  const todayCheckIn = checkIns.find((entry) => sameDay(entry.date, todayIso()));
  const todayActivities = activities.filter((entry) => sameDay(entry.date, todayIso()));
  const currentWeight = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const rehabAdherence = calculateRehabAdherence(checkIns);
  const painAverage = weeklyPainAverage(injuries, injuryLogs);
  const weeklyActivity = weeklyActivityStats(activities);
  const weightTrend = calculateWeightTrend(weightEntries);
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
  const selectedSummary = checkIns.find((entry) => sameDay(entry.date, selectedDate));

  return (
    <div className="space-y-5">
      <Panel className="space-y-4 rounded-[36px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Home</p>
        <h2 className="text-3xl font-semibold text-ink">
          {user?.name ? `Hola, ${user.name}` : 'Tu semana en RecoveryOS'}
        </h2>
        <p className="text-sm leading-7 text-ink/72">
          Check-in rapido, progreso visible y todo listo para usar cada dia desde movil.
        </p>
        <div className="rounded-[28px] bg-canvas p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-moss">Recovery Score</p>
          <div className="mt-3 flex items-end gap-4">
            <span className="text-5xl font-semibold text-ink">{recoveryScore}</span>
            <span className="pb-2 text-sm text-ink/60">sobre 100</span>
          </div>
        </div>
      </Panel>

      <Panel className="space-y-4 rounded-[32px]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-moss">Semana</p>
            <h3 className="mt-1 text-2xl font-semibold">Calendario funcional</h3>
          </div>
          <span className="rounded-full bg-canvas px-3 py-2 text-xs text-ink/70">
            {formatShortDate(selectedDate)}
          </span>
        </div>
        <WeeklyCalendar
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          checkIns={checkIns}
          weights={weightEntries}
          activities={activities}
          injuryLogs={injuryLogs}
        />
        <div className="rounded-2xl bg-canvas p-4 text-sm text-ink/78">
          {selectedSummary ? (
            <div className="space-y-2">
              <p>Peso: {selectedSummary.weightKg ? `${selectedSummary.weightKg} kg` : 'sin peso'}</p>
              <p>Actividades: {selectedSummary.activities.length || 0}</p>
              <p>Lesiones registradas: {selectedSummary.injuryLogs.length || 0}</p>
              <p>Habitos: {Object.entries(selectedSummary.habits).filter(([, value]) => value).map(([key]) => key).join(', ') || 'ninguno'}</p>
              <p>Notas: {selectedSummary.notes ?? 'sin notas'}</p>
            </div>
          ) : (
            <p>Toca un dia para ver el resumen. Si no hay datos, haz el check-in.</p>
          )}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Peso actual"
          value={currentWeight ? `${currentWeight.weightKg.toFixed(1)} kg` : '--'}
          subtitle={
            weightTrend.weeklyChange !== null
              ? `${weightTrend.weeklyChange > 0 ? '+' : ''}${weightTrend.weeklyChange} kg semanal`
              : 'Sin tendencia suficiente'
          }
        />
        <Card
          title="Dolor medio"
          value={painAverage !== null ? `${painAverage}/10` : '--'}
          subtitle="Lesiones activas"
        />
        <Card
          title="Actividad"
          value={`${weeklyActivity.totalMinutes} min`}
          subtitle={`${weeklyActivity.totalSessions} sesiones esta semana`}
        />
        <Card
          title="Adherencia rehab"
          value={`${rehabAdherence}%`}
          subtitle="Ultimos 7 dias"
        />
      </div>

      <Panel className="rounded-[32px]">
        <p className="text-xs uppercase tracking-[0.2em] text-moss">Insight</p>
        <h3 className="mt-2 text-2xl font-semibold">Regla simple, accion clara</h3>
        <p className="mt-3 text-sm leading-7 text-ink/78">{insight}</p>
      </Panel>

      <DailyCheckInPanel />
    </div>
  );
}

