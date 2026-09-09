import { Inject, Injectable } from '@nestjs/common';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../../injury/domain/injury-repository.port';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';
import {
  DAY_SCORE_WEIGHTS, combineWeightedScore, computeDailyLoad, computeAcuteChronicRatio,
  loadScoreFromRatio, loadStatusFromRatio, sleepScoreFromEntry, hrvScoreFromValues, painScoreFromLogs, scoreLabel,
} from '../../domain/day-score-math';
import { buildDayScoreInsight } from '../../domain/day-score-insights';

export interface DayScoreResult {
  score: number | null;
  label: string | null;
  explanation: string | null;
  tip: string | null;
  components: {
    sleep: { score: number | null; durationH: number | null; label: string | null };
    hrv: { score: number | null; valueMs: number | null; deltaPct: number | null };
    pain: { score: number | null; avgPainLevel: number | null };
    load: { score: number | null; ratio: number | null; status: 'alta' | 'normal' | 'baja' | null };
  };
  weights: typeof DAY_SCORE_WEIGHTS;
}

const WINDOW_DAYS = 28;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class GetDayScoreUseCase {
  constructor(
    @Inject(SLEEP_REPOSITORY) private readonly sleepRepo: SleepRepositoryPort,
    @Inject(INJURY_REPOSITORY) private readonly injuryRepo: InjuryRepositoryPort,
    @Inject(ACTIVITY_REPOSITORY) private readonly activityRepo: ActivityRepositoryPort,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  async execute(userId: string, date: Date = new Date()): Promise<DayScoreResult> {
    const target = startOfUtcDay(date);
    const windowStart = addDaysUtc(target, -(WINDOW_DAYS - 1));

    const [sleepEntries, injuries, activities, healthMetricRows] = await Promise.all([
      this.sleepRepo.findByUser(userId),
      this.injuryRepo.findInjuriesByUser(userId),
      this.activityRepo.findByUserFrom(userId, windowStart),
      this.healthMetrics.findRange(userId, windowStart, target),
    ]);

    // One "best" health-metric row per day: prefer whichever row actually carries hrv/restingHeartRate,
    // since a manual and a COROS row can coexist for the same date and only COROS populates those fields.
    const healthByDay = new Map<string, { hrv: number | null; restingHeartRate: number | null }>();
    for (const row of healthMetricRows) {
      const key = dateKey(row.date);
      const existing = healthByDay.get(key);
      const candidate = { hrv: row.hrv, restingHeartRate: row.restingHeartRate };
      if (!existing || (existing.hrv == null && candidate.hrv != null)) {
        healthByDay.set(key, candidate);
      }
    }

    // ── Sleep ──
    const todaySleep = sleepEntries.find((e) => dateKey(e.date) === dateKey(target)) ?? null;
    const sleepScore = sleepScoreFromEntry(todaySleep ? { score: todaySleep.score, quality: todaySleep.quality } : null);

    // ── HRV ──
    const todayHrv = healthByDay.get(dateKey(target))?.hrv ?? null;
    const previous7dHrv: number[] = [];
    for (let i = 1; i <= 7; i++) {
      const v = healthByDay.get(dateKey(addDaysUtc(target, -i)))?.hrv;
      if (v != null) previous7dHrv.push(v);
    }
    const hrvScore = hrvScoreFromValues(todayHrv, previous7dHrv);
    const hrvBaseline = previous7dHrv.length > 0 ? previous7dHrv.reduce((s, v) => s + v, 0) / previous7dHrv.length : null;
    const hrvDeltaPct = todayHrv != null && hrvBaseline != null && hrvBaseline !== 0
      ? Math.round(((todayHrv - hrvBaseline) / hrvBaseline) * 100)
      : null;

    // ── Pain ──
    const activeInjuries = injuries.filter((i) => i.status !== 'resolved');
    const hasActiveInjuries = activeInjuries.length > 0;
    const activeInjuryIds = new Set(activeInjuries.map((i) => i.id));
    const todayPainLevels = injuries
      .flatMap((i) => i.logs)
      .filter((log) => activeInjuryIds.has(log.injuryId) && dateKey(log.date) === dateKey(target))
      .map((log) => log.painLevel);
    const painScore = painScoreFromLogs(todayPainLevels, hasActiveInjuries);
    const avgPainLevel = todayPainLevels.length > 0
      ? Number((todayPainLevels.reduce((s, v) => s + v, 0) / todayPainLevels.length).toFixed(1))
      : null;

    // ── Training load ──
    const dailyLoads: number[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const day = addDaysUtc(target, -i);
      const dayKey = dateKey(day);
      const daySessions = activities
        .filter((a) => dateKey(a.props.performedAt) === dayKey)
        .map((a) => ({ durationMin: a.props.durationMin ?? 0, avgHeartRate: a.props.avgHeartRate ?? null }));
      const restingHr = healthByDay.get(dayKey)?.restingHeartRate ?? null;
      dailyLoads.push(computeDailyLoad(daySessions, restingHr));
    }
    const last7DailyLoads = dailyLoads.slice(-7);
    const ratio = computeAcuteChronicRatio(last7DailyLoads, dailyLoads);
    const loadScore = loadScoreFromRatio(ratio);
    const loadStatus = loadStatusFromRatio(ratio);

    // ── Combine ──
    const score = combineWeightedScore({ sleep: sleepScore, hrv: hrvScore, pain: painScore, load: loadScore });
    const insight = score !== null
      ? buildDayScoreInsight({ sleepScore, hrvScore, painScore, loadStatus })
      : null;

    return {
      score,
      label: score !== null ? scoreLabel(score) : null,
      explanation: insight?.explanation ?? null,
      tip: insight?.tip ?? null,
      components: {
        sleep: { score: sleepScore, durationH: todaySleep?.durationH ?? null, label: todaySleep ? (todaySleep.score != null ? null : null) : null },
        hrv: { score: hrvScore, valueMs: todayHrv, deltaPct: hrvDeltaPct },
        pain: { score: painScore, avgPainLevel },
        load: { score: loadScore, ratio, status: loadStatus },
      },
      weights: DAY_SCORE_WEIGHTS,
    };
  }
}
