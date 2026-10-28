import { sameDay } from './date';
import type { StructuredGoal } from '../stores/plan-store';

export const STEPS_GOAL = 10000;
export const ACTIVE_CALORIES_GOAL = 700;

// Manual entries win over COROS ones for the same day; COROS is only used as a fallback
// when no manual entry exists for that day.
export function pickBySourcePrecedence<T extends { date: string; source?: string }>(
  entries: T[],
  date: string,
): T | undefined {
  const sameDayEntries = entries.filter((e) => sameDay(e.date, date));
  return sameDayEntries.find((e) => (e.source ?? 'manual') === 'manual') ?? sameDayEntries[0];
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getMovementPercent(steps: number, activeCalories: number) {
  const stepsPct = clampPercent((steps / STEPS_GOAL) * 100);
  const activeCaloriesPct = clampPercent((activeCalories / ACTIVE_CALORIES_GOAL) * 100);

  return {
    stepsPct,
    activeCaloriesPct,
    overallPct: clampPercent((stepsPct + activeCaloriesPct) / 2),
  };
}

/** Daily steps / active-kcal targets: the user's enabled goals, falling back to the defaults. */
export function getDailyTargets(goals: StructuredGoal[]) {
  const pick = (type: StructuredGoal['type'], fallback: number) => {
    const goal = goals.find((g) => g.type === type && g.enabled && g.target > 0);
    return goal ? goal.target : fallback;
  };
  return {
    steps: pick('steps_daily', STEPS_GOAL),
    activeCalories: pick('active_calories_daily', ACTIVE_CALORIES_GOAL),
  };
}
