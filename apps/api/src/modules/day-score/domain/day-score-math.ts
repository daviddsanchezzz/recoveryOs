export const DAY_SCORE_WEIGHTS = { sleep: 25, hrv: 30, pain: 25, load: 20 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ── Training load ──────────────────────────────────────────────────────────

export function computeSessionLoad(
  durationMin: number,
  avgHeartRate: number | null,
  restingHeartRate: number | null,
): number {
  if (avgHeartRate != null && restingHeartRate != null && restingHeartRate > 0) {
    return durationMin * (avgHeartRate / restingHeartRate);
  }
  return durationMin;
}

export function computeDailyLoad(
  sessions: Array<{ durationMin: number; avgHeartRate: number | null }>,
  restingHeartRate: number | null,
): number {
  return sessions.reduce((sum, s) => sum + computeSessionLoad(s.durationMin, s.avgHeartRate, restingHeartRate), 0);
}

/** `last7DailyLoads`/`last28DailyLoads` must include a 0 entry for every day with no activity. */
export function computeAcuteChronicRatio(last7DailyLoads: number[], last28DailyLoads: number[]): number | null {
  const chronicAvg = mean(last28DailyLoads);
  if (chronicAvg === 0) return null;
  return mean(last7DailyLoads) / chronicAvg;
}

export function loadScoreFromRatio(ratio: number | null): number | null {
  if (ratio === null) return null;
  if (ratio >= 0.8 && ratio <= 1.3) return 100;
  if (ratio > 1.3) return clamp(100 - (ratio - 1.3) * 200, 0, 100);
  return clamp(100 - (0.8 - ratio) * 100, 50, 100);
}

export function loadStatusFromRatio(ratio: number | null): 'alta' | 'normal' | 'baja' | null {
  if (ratio === null) return null;
  if (ratio > 1.3) return 'alta';
  if (ratio < 0.8) return 'baja';
  return 'normal';
}

// ── Component scores ───────────────────────────────────────────────────────

export function sleepScoreFromEntry(entry: { score: number | null; quality: number } | null): number | null {
  if (!entry) return null;
  return entry.score ?? entry.quality * 20;
}

/** `previous7dHrvValues` excludes today and must have at least 3 values to form a reliable baseline. */
export function hrvScoreFromValues(todayHrv: number | null, previous7dHrvValues: number[]): number | null {
  if (todayHrv == null || previous7dHrvValues.length < 3) return null;
  const baseline = mean(previous7dHrvValues);
  if (baseline === 0) return null;
  const ratio = todayHrv / baseline;
  return Math.round(clamp(50 + (ratio - 1) * 100, 0, 100));
}

export function painScoreFromLogs(todayPainLevels: number[], hasActiveInjuries: boolean): number | null {
  if (!hasActiveInjuries) return 100;
  if (todayPainLevels.length === 0) return null;
  const avgPain = mean(todayPainLevels);
  return clamp((10 - avgPain) * 10, 0, 100);
}

// ── Combination ─────────────────────────────────────────────────────────────

export function combineWeightedScore(components: {
  sleep: number | null;
  hrv: number | null;
  pain: number | null;
  load: number | null;
}): number | null {
  const present = (Object.keys(DAY_SCORE_WEIGHTS) as Array<keyof typeof DAY_SCORE_WEIGHTS>)
    .filter((key) => components[key] !== null);
  if (present.length === 0) return null;

  const totalWeight = present.reduce((sum, key) => sum + DAY_SCORE_WEIGHTS[key], 0);
  const weightedSum = present.reduce((sum, key) => sum + (components[key] as number) * DAY_SCORE_WEIGHTS[key], 0);
  return Math.round(weightedSum / totalWeight);
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Muy bien';
  if (score >= 55) return 'Bastante bien';
  if (score >= 40) return 'Regular';
  return 'Cuidado';
}
