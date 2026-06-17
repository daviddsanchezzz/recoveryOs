import type {
  ActivityEntry,
  DailyCheckIn,
  Injury,
  InjuryLog,
  WeightEntry,
} from '../stores/recovery-store';
import { addDays, sameDay, todayIso, weekDates } from './date';

export function calculateRecoveryScore(input: {
  activeInjuries: Injury[];
  injuryLogs: InjuryLog[];
  todayCheckIn?: DailyCheckIn;
  todayActivities: ActivityEntry[];
}) {
  let score = 50;
  const today = todayIso();
  const painLogs = input.injuryLogs.filter(
    (log) =>
      sameDay(log.date, today) &&
      input.activeInjuries.some((injury) => injury.id === log.injuryId && injury.status !== 'resolved'),
  );

  if (input.todayCheckIn) score += 15;
  if (input.todayCheckIn?.habits.rehab) score += 10;
  if (input.todayCheckIn?.habits.goodNutrition) score += 8;
  if (input.todayCheckIn?.habits.enoughProtein) score += 7;
  if (input.todayActivities.length > 0) score += 8;

  if (painLogs.length > 0) {
    const averagePain = painLogs.reduce((sum, log) => sum + log.painLevel, 0) / painLogs.length;
    score -= averagePain * 4;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function calculateWeightTrend(entries: WeightEntry[]) {
  const sorted = [...entries].sort((left, right) => left.date.localeCompare(right.date));
  const today = todayIso();
  const currentWeekStart = addDays(today, -6);
  const previousWeekStart = addDays(today, -13);
  const previousWeekEnd = addDays(today, -7);

  const currentWeek = sorted.filter((entry) => entry.date >= currentWeekStart);
  const previousWeek = sorted.filter(
    (entry) => entry.date >= previousWeekStart && entry.date <= previousWeekEnd,
  );

  const currentAverage =
    currentWeek.length > 0
      ? currentWeek.reduce((sum, entry) => sum + entry.weightKg, 0) / currentWeek.length
      : null;
  const previousAverage =
    previousWeek.length > 0
      ? previousWeek.reduce((sum, entry) => sum + entry.weightKg, 0) / previousWeek.length
      : null;

  return {
    currentAverage,
    previousAverage,
    weeklyChange:
      currentAverage !== null && previousAverage !== null
        ? Number((currentAverage - previousAverage).toFixed(1))
        : null,
  };
}

export function calculateRehabAdherence(checkIns: DailyCheckIn[]) {
  const dates = weekDates();
  const daysWithRehab = dates.filter((date) =>
    checkIns.some((checkIn) => sameDay(checkIn.date, date) && checkIn.habits.rehab),
  ).length;
  return Math.round((daysWithRehab / 7) * 100);
}

export function calculateCheckInStreak(checkIns: DailyCheckIn[]) {
  const checkInDates = new Set(checkIns.map((checkIn) => checkIn.date));
  let streak = 0;
  let cursor = todayIso();

  while (checkInDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function weeklyActivityStats(activities: ActivityEntry[]) {
  const dates = weekDates();
  const weeklyActivities = activities.filter((activity) =>
    dates.some((date) => sameDay(date, activity.date)),
  );
  return {
    totalMinutes: weeklyActivities.reduce((sum, activity) => sum + (activity.durationMinutes ?? 0), 0),
    totalSessions: weeklyActivities.length,
    byType: weeklyActivities.reduce<Record<string, number>>((accumulator, activity) => {
      accumulator[activity.type] = (accumulator[activity.type] ?? 0) + 1;
      return accumulator;
    }, {}),
  };
}

export function weeklyPainAverage(activeInjuries: Injury[], logs: InjuryLog[]) {
  const activeIds = new Set(activeInjuries.filter((injury) => injury.status !== 'resolved').map((injury) => injury.id));
  const dates = weekDates();
  const relevant = logs.filter(
    (log) => activeIds.has(log.injuryId) && dates.some((date) => sameDay(date, log.date)),
  );
  if (relevant.length === 0) return null;
  return Number((relevant.reduce((sum, log) => sum + log.painLevel, 0) / relevant.length).toFixed(1));
}

export function buildRuleBasedInsight(input: {
  activeInjuries: Injury[];
  injuryLogs: InjuryLog[];
  checkIns: DailyCheckIn[];
  weights: WeightEntry[];
}) {
  const rehabAdherence = calculateRehabAdherence(input.checkIns);
  const painAverage = weeklyPainAverage(input.activeInjuries, input.injuryLogs);
  const todayWeight = input.weights.find((entry) => sameDay(entry.date, todayIso()));

  if (painAverage !== null && painAverage <= 3) {
    return 'Tu dolor medio ha mejorado esta semana.';
  }

  if (rehabAdherence < 57) {
    return 'Intenta completar mas sesiones de rehab esta semana.';
  }

  if (!todayWeight) {
    return 'Registra tu peso para mantener la tendencia actualizada.';
  }

  return 'Buen ritmo. Mantener consistencia sera mas valioso que apretar un solo dia.';
}

