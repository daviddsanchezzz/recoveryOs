import type { SleepEntry } from '../stores/recovery-store';

/** Returns a unified 0-100 sleep score for both COROS and manual entries. */
export function sleepScore(entry: Pick<SleepEntry, 'score' | 'quality'>): number {
  return entry.score ?? entry.quality * 20;
}

export function sleepScoreLabel(score: number): string {
  if (score >= 90) return 'Óptima';
  if (score >= 70) return 'Buena';
  if (score >= 50) return 'Normal';
  if (score >= 30) return 'Regular';
  return 'Mala';
}
