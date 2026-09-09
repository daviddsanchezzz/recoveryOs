import { GetDayScoreUseCase } from './get-day-score.use-case';
import { SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';
import { InjuryRepositoryPort } from '../../../injury/domain/injury-repository.port';
import { ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';
import { ActivityEntity } from '../../../activity/domain/activity.entity';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';

const TARGET = new Date('2026-09-09T00:00:00.000Z');

function makeDeps() {
  const sleepRepo = { findByUser: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<SleepRepositoryPort>;
  const injuryRepo = { findInjuriesByUser: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<InjuryRepositoryPort>;
  const activityRepo = { findByUserFrom: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<ActivityRepositoryPort>;
  const healthMetrics = { findRange: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<HealthMetricsService>;
  return { sleepRepo, injuryRepo, activityRepo, healthMetrics };
}

describe('GetDayScoreUseCase', () => {
  it('defaults to a pain-only score of 100 when nothing is logged and there are no active injuries', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    // sleep/hrv/load are all null (nothing logged). pain defaults to 100 when there are no active
    // injuries — painScoreFromLogs([], false) === 100 (day-score-math.ts) — and combineWeightedScore
    // renormalizes over whatever components are present, so pain alone drives the composite to 100.
    expect(result.components.sleep.score).toBeNull();
    expect(result.components.hrv.score).toBeNull();
    expect(result.components.load.score).toBeNull();
    expect(result.components.pain.score).toBe(100); // no active injuries -> always 100
    expect(result.score).toBe(100);
    expect(result.label).toBe('Excelente');
  });

  it('combines sleep, HRV, and pain when present, with load excluded (no activity in window)', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    sleepRepo.findByUser.mockResolvedValue([
      { id: 's1', userId: 'user-1', date: TARGET, durationH: 7, quality: 4, score: null, source: 'manual' } as never,
    ]);
    injuryRepo.findInjuriesByUser.mockResolvedValue([]); // no active injuries -> pain = 100
    healthMetrics.findRange.mockResolvedValue([
      { date: TARGET, hrv: 66, restingHeartRate: 60 } as never,
      { date: new Date('2026-09-08'), hrv: 60, restingHeartRate: 60 } as never,
      { date: new Date('2026-09-07'), hrv: 60, restingHeartRate: 60 } as never,
      { date: new Date('2026-09-06'), hrv: 60, restingHeartRate: 60 } as never,
    ]);
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    expect(result.components.sleep.score).toBe(80); // quality 4 * 20
    expect(result.components.hrv.score).toBe(60);   // ratio 1.1 -> 50+10
    expect(result.components.pain.score).toBe(100);
    expect(result.components.load.score).toBeNull(); // no activity in 28-day window
    expect(result.score).not.toBeNull();
    expect(result.label).not.toBeNull();
    expect(result.explanation).not.toBeNull();
    expect(result.tip).not.toBeNull();
  });

  it('scopes pain to active injuries only, ignoring resolved ones', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    injuryRepo.findInjuriesByUser.mockResolvedValue([
      {
        id: 'inj-1', userId: 'user-1', name: 'Rodilla', startDate: new Date('2026-08-01'), status: 'active',
        phaseLabel: null, phaseStartDate: null, phaseTargetSessions: null,
        logs: [{ id: 'l1', injuryId: 'inj-1', userId: 'user-1', date: TARGET, painLevel: 4, didRehab: true }],
      } as never,
      {
        id: 'inj-2', userId: 'user-1', name: 'Tobillo (resuelto)', startDate: new Date('2026-01-01'), status: 'resolved',
        phaseLabel: null, phaseStartDate: null, phaseTargetSessions: null,
        logs: [{ id: 'l2', injuryId: 'inj-2', userId: 'user-1', date: TARGET, painLevel: 9, didRehab: false }],
      } as never,
    ]);
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    // only inj-1's log (painLevel 4) counts; inj-2 is resolved and excluded
    expect(result.components.pain.avgPainLevel).toBe(4);
    expect(result.components.pain.score).toBe(60); // (10-4)*10
  });

  it('computes training load from activities in the 28-day window', async () => {
    const { sleepRepo, injuryRepo, activityRepo, healthMetrics } = makeDeps();
    activityRepo.findByUserFrom.mockResolvedValue([
      new ActivityEntity({
        id: 'a1', userId: 'user-1', type: 'run', source: 'manual',
        performedAt: TARGET, durationMin: 60, avgHeartRate: 120,
      }),
    ]);
    healthMetrics.findRange.mockResolvedValue([
      { date: TARGET, hrv: null, restingHeartRate: 60 } as never,
    ]);
    const useCase = new GetDayScoreUseCase(sleepRepo, injuryRepo, activityRepo, healthMetrics);

    const result = await useCase.execute('user-1', TARGET);

    // One 120-load session on a single day. Spread over the trailing 7-day window: avg = 120/7 ≈ 17.14.
    // Spread over the full 28-day window: avg = 120/28 ≈ 4.29. ratio = (120/7)/(120/28) = 28/7 = 4 exactly —
    // a sharp acute:chronic spike (a single hard day after an otherwise quiet 28-day baseline reads as
    // overload), which correctly maps to 'alta' with a load score of 0 per loadScoreFromRatio/loadStatusFromRatio.
    expect(result.components.load.ratio).toBe(4);
    expect(result.components.load.score).toBe(0);
    expect(result.components.load.status).toBe('alta');
  });
});
