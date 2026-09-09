import { Inject, Injectable } from '@nestjs/common';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepositoryPort,
} from '../../../activity/domain/activity-repository.port';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';
import {
  INJURY_REPOSITORY,
  InjuryRepositoryPort,
} from '../../../injury/domain/injury-repository.port';
import {
  NUTRITION_GOAL_REPOSITORY,
  NutritionGoalRepositoryPort,
} from '../../../nutrition/domain/nutrition-goal-repository.port';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../../nutrition/domain/nutrition-repository.port';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';
import { WEIGHT_REPOSITORY, WeightRepositoryPort } from '../../../weight/domain/weight-repository.port';
import { HealthContext, HealthMetricSnapshot } from '../../domain/health-context';

const iso = (date: Date) => date.toISOString().slice(0, 10);
const round = (value: number, decimals = 1) => Number(value.toFixed(decimals));
const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function shiftDate(date: Date, days: number) {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

function percentChange(current: number | null, baseline: number | null) {
  if (current === null || baseline === null || baseline === 0) return null;
  return round(((current - baseline) / baseline) * 100);
}

type MetricRow = Awaited<ReturnType<HealthMetricsService['findRange']>>[number];

function mergeMetricsByDay(rows: MetricRow[]) {
  const byDay = new Map<string, HealthMetricSnapshot>();
  for (const row of rows) {
    const key = iso(row.date);
    const current = byDay.get(key) ?? {
      restingHeartRate: null,
      hrv: null,
      stressAvg: null,
      recoveryPct: null,
      steps: 0,
      activeCalories: 0,
    };
    byDay.set(key, {
      restingHeartRate: row.restingHeartRate ?? current.restingHeartRate,
      hrv: row.hrv ?? current.hrv,
      stressAvg: row.stressAvg ?? current.stressAvg,
      recoveryPct: row.recoveryPct ?? current.recoveryPct,
      steps: Math.max(current.steps, row.steps),
      activeCalories: Math.max(current.activeCalories, row.activeCalories),
    });
  }
  return byDay;
}

@Injectable()
export class HealthContextService {
  constructor(
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepositoryPort,
    @Inject(SLEEP_REPOSITORY) private readonly sleep: SleepRepositoryPort,
    @Inject(INJURY_REPOSITORY) private readonly injuries: InjuryRepositoryPort,
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepositoryPort,
    @Inject(NUTRITION_GOAL_REPOSITORY) private readonly nutritionGoals: NutritionGoalRepositoryPort,
    @Inject(WEIGHT_REPOSITORY) private readonly weights: WeightRepositoryPort,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  async build(userId: string, targetDate: string): Promise<HealthContext> {
    const start = new Date(`${targetDate}T00:00:00.000Z`);
    const end = new Date(`${targetDate}T23:59:59.999Z`);
    const start28 = shiftDate(start, -27);
    const start7 = shiftDate(start, -6);
    const startPrevious7 = shiftDate(start, -13);
    const endPrevious7 = new Date(shiftDate(start, -7).getTime() + 86_399_999);

    const [activityRows, sleepRows, injuryRows, nutritionRows, nutritionGoal, weightRows, metricRows] =
      await Promise.all([
        this.activities.findByUserFrom(userId, start28),
        this.sleep.findByUser(userId),
        this.injuries.findInjuriesByUser(userId),
        this.nutrition.findByDateRange(userId, start7, end),
        this.nutritionGoals.findByUser(userId),
        this.weights.findByUser(userId),
        this.healthMetrics.findRange(userId, start28, end),
      ]);

    const inRangeActivities = activityRows.filter((row) => row.props.performedAt <= end);
    const todayActivities = inRangeActivities.filter((row) => iso(row.props.performedAt) === targetDate);
    const last7Activities = inRangeActivities.filter((row) => row.props.performedAt >= start7);
    const previous7Activities = inRangeActivities.filter(
      (row) => row.props.performedAt >= startPrevious7 && row.props.performedAt <= endPrevious7,
    );
    const summarizeActivity = (rows: typeof activityRows) => ({
      sessions: rows.length,
      durationMin: round(rows.reduce((sum, row) => sum + (row.props.durationMin ?? 0), 0)),
      distanceKm: round(rows.reduce((sum, row) => sum + (row.props.distanceKm ?? 0), 0)),
    });
    const last7Summary = summarizeActivity(last7Activities);
    const previous7Summary = summarizeActivity(previous7Activities);

    const sleepByDay = new Map<string, (typeof sleepRows)[number]>();
    for (const row of sleepRows.filter((entry) => entry.date >= start28 && entry.date <= end)) {
      const key = iso(row.date);
      const current = sleepByDay.get(key);
      if (!current || (current.score === null && row.score !== null)) sleepByDay.set(key, row);
    }
    const sleeps28 = [...sleepByDay.values()];
    const sleeps7 = sleeps28.filter((row) => row.date >= start7);
    const todaySleep = sleepByDay.get(targetDate) ?? null;

    const metricsByDay = mergeMetricsByDay(metricRows);
    const todayMetric = metricsByDay.get(targetDate) ?? null;
    const baselineMetrics = [...metricsByDay.entries()]
      .filter(([date]) => date !== targetDate)
      .map(([, value]) => value);
    const baselineHrv = average(
      baselineMetrics.flatMap((metric) => (metric.hrv === null ? [] : [metric.hrv])),
    );
    const baselineRestingHeartRate = average(
      baselineMetrics.flatMap((metric) =>
        metric.restingHeartRate === null ? [] : [metric.restingHeartRate],
      ),
    );
    const baselineStress = average(
      baselineMetrics.flatMap((metric) => (metric.stressAvg === null ? [] : [metric.stressAvg])),
    );
    const baselineRecovery = average(
      baselineMetrics.flatMap((metric) =>
        metric.recoveryPct === null ? [] : [metric.recoveryPct],
      ),
    );

    const todayMeals = nutritionRows.filter((row) => iso(row.consumedAt) === targetDate);
    const nutritionByDay = new Map<string, { calories: number; protein: number }>();
    for (const meal of nutritionRows) {
      const key = iso(meal.consumedAt);
      const current = nutritionByDay.get(key) ?? { calories: 0, protein: 0 };
      current.calories += meal.calories;
      current.protein += meal.proteinGrams;
      nutritionByDay.set(key, current);
    }
    const loggedNutritionDays = [...nutritionByDay.values()];

    const activeInjuries = injuryRows
      .filter((injury) => injury.status === 'active' || injury.status === 'recovering')
      .map((injury) => {
        const latest = injury.logs[0] ?? null;
        return {
          name: injury.name,
          bodyPart: injury.bodyPart ?? null,
          status: injury.status,
          latestPain: latest?.painLevel ?? null,
          latestLogDate: latest ? iso(latest.date) : null,
          rehabCompleted: latest?.didRehab ?? null,
        };
      });

    const weightsInRange = weightRows.filter((row) => row.date >= start28 && row.date <= end);
    const sortedWeights = [...weightsInRange].sort((a, b) => a.date.getTime() - b.date.getTime());
    const earliestWeight = sortedWeights[0] ?? null;
    const latestWeight = sortedWeights.at(-1) ?? null;

    const missingData: string[] = [];
    if (!todaySleep) missingData.push('sueño de hoy');
    if (todayMetric?.hrv == null) missingData.push('HRV de hoy');
    if (todayMetric?.restingHeartRate == null) missingData.push('frecuencia cardiaca en reposo de hoy');
    if (todayMetric?.recoveryPct == null) missingData.push('recuperación de hoy');
    if (!nutritionRows.length) missingData.push('nutrición de los últimos 7 días');

    return {
      date: targetDate,
      window: { from: iso(start28), to: targetDate, days: 28 },
      sleep: {
        today: todaySleep
          ? {
              durationH: round(todaySleep.durationH, 2),
              score: todaySleep.score,
              quality: todaySleep.quality,
              source: todaySleep.source,
            }
          : null,
        averageDuration7d: average(sleeps7.map((row) => row.durationH)) === null
          ? null
          : round(average(sleeps7.map((row) => row.durationH))!, 2),
        averageScore7d: average(sleeps7.flatMap((row) => (row.score === null ? [] : [row.score]))) === null
          ? null
          : round(average(sleeps7.flatMap((row) => (row.score === null ? [] : [row.score])))!),
        daysWithData7d: new Set(sleeps7.map((row) => iso(row.date))).size,
      },
      recovery: {
        today: todayMetric,
        baseline28d: {
          restingHeartRate: baselineRestingHeartRate === null ? null : round(baselineRestingHeartRate),
          hrv: baselineHrv === null ? null : round(baselineHrv),
          stressAvg: baselineStress === null ? null : round(baselineStress),
          recoveryPct: baselineRecovery === null ? null : round(baselineRecovery),
        },
        hrvChangePct: percentChange(todayMetric?.hrv ?? null, baselineHrv),
        restingHeartRateChangePct: percentChange(
          todayMetric?.restingHeartRate ?? null,
          baselineRestingHeartRate,
        ),
        daysWithData28d: metricsByDay.size,
      },
      activity: {
        today: todayActivities.map((row) => ({
          type: row.props.type,
          durationMin: row.props.durationMin ?? null,
          distanceKm: row.props.distanceKm ?? null,
          calories: row.props.calories ?? null,
        })),
        last7d: last7Summary,
        previous7d: previous7Summary,
        loadChangePct: percentChange(last7Summary.durationMin, previous7Summary.durationMin),
      },
      nutrition: {
        today: {
          calories: todayMeals.reduce((sum, meal) => sum + meal.calories, 0),
          proteinGrams: round(todayMeals.reduce((sum, meal) => sum + meal.proteinGrams, 0)),
          meals: todayMeals.length,
        },
        averageLoggedDay7d: loggedNutritionDays.length
          ? {
              calories: Math.round(average(loggedNutritionDays.map((day) => day.calories))!),
              proteinGrams: round(average(loggedNutritionDays.map((day) => day.protein))!),
            }
          : null,
        daysWithData7d: loggedNutritionDays.length,
        targets: nutritionGoal
          ? { calories: nutritionGoal.caloriesTarget, proteinGrams: nutritionGoal.proteinTarget }
          : null,
      },
      injuries: activeInjuries,
      weight: {
        latestKg: latestWeight?.weightKg ?? null,
        latestDate: latestWeight ? iso(latestWeight.date) : null,
        change28dKg:
          latestWeight && earliestWeight
            ? round(latestWeight.weightKg - earliestWeight.weightKg)
            : null,
      },
      missingData,
    };
  }
}
