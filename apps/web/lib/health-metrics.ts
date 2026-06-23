export const STEPS_GOAL = 10000;
export const ACTIVE_CALORIES_GOAL = 700;

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
