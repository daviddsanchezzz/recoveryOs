import { ActivityEntity } from '../../../activity/domain/activity.entity';
import { HealthContextService } from './health-context.service';

describe('HealthContextService', () => {
  it('builds trends and comparisons from the user health records', async () => {
    const activities = {
      findByUserFrom: jest.fn().mockResolvedValue([
        new ActivityEntity({
          id: 'a1', userId: 'u1', type: 'run', source: 'coros',
          performedAt: new Date('2026-09-09T08:00:00.000Z'), durationMin: 60, distanceKm: 10,
        }),
        new ActivityEntity({
          id: 'a2', userId: 'u1', type: 'gym', source: 'manual',
          performedAt: new Date('2026-09-03T08:00:00.000Z'), durationMin: 40,
        }),
        new ActivityEntity({
          id: 'a3', userId: 'u1', type: 'walk', source: 'manual',
          performedAt: new Date('2026-09-01T08:00:00.000Z'), durationMin: 50,
        }),
      ]),
    };
    const sleep = {
      findByUser: jest.fn().mockResolvedValue([
        { date: new Date('2026-09-09T00:00:00.000Z'), durationH: 6, score: 55, quality: 3, source: 'coros' },
        { date: new Date('2026-09-08T00:00:00.000Z'), durationH: 8, score: 80, quality: 3, source: 'coros' },
      ]),
    };
    const injuries = {
      findInjuriesByUser: jest.fn().mockResolvedValue([
        {
          name: 'Tobillo', bodyPart: 'ankle', status: 'active',
          logs: [{ date: new Date('2026-09-09T10:00:00.000Z'), painLevel: 5, didRehab: false }],
        },
      ]),
    };
    const nutrition = {
      findByDateRange: jest.fn().mockResolvedValue([
        { consumedAt: new Date('2026-09-09T12:00:00.000Z'), calories: 800, proteinGrams: 50 },
        { consumedAt: new Date('2026-09-08T12:00:00.000Z'), calories: 2000, proteinGrams: 140 },
      ]),
    };
    const nutritionGoals = {
      findByUser: jest.fn().mockResolvedValue({ caloriesTarget: 2300, proteinTarget: 150 }),
    };
    const weights = {
      findByUser: jest.fn().mockResolvedValue([
        { date: new Date('2026-08-20T00:00:00.000Z'), weightKg: 80 },
        { date: new Date('2026-09-09T00:00:00.000Z'), weightKg: 79 },
      ]),
    };
    const healthMetrics = {
      findRange: jest.fn().mockResolvedValue([
        { date: new Date('2026-09-07T00:00:00.000Z'), hrv: 50, restingHeartRate: 60, stressAvg: 30, recoveryPct: 70, steps: 8000, activeCalories: 500 },
        { date: new Date('2026-09-08T00:00:00.000Z'), hrv: 50, restingHeartRate: 60, stressAvg: 30, recoveryPct: 70, steps: 8000, activeCalories: 500 },
        { date: new Date('2026-09-09T00:00:00.000Z'), hrv: 40, restingHeartRate: 66, stressAvg: 50, recoveryPct: 45, steps: 1000, activeCalories: 100 },
      ]),
    };

    const service = new HealthContextService(
      activities as never,
      sleep as never,
      injuries as never,
      nutrition as never,
      nutritionGoals as never,
      weights as never,
      healthMetrics as never,
    );

    const result = await service.build('u1', '2026-09-09');

    expect(result.sleep.averageDuration7d).toBe(7);
    expect(result.recovery.hrvChangePct).toBe(-20);
    expect(result.recovery.restingHeartRateChangePct).toBe(10);
    expect(result.activity.last7d).toMatchObject({ sessions: 2, durationMin: 100, distanceKm: 10 });
    expect(result.activity.previous7d.durationMin).toBe(50);
    expect(result.activity.loadChangePct).toBe(100);
    expect(result.nutrition.averageLoggedDay7d).toEqual({ calories: 1400, proteinGrams: 95 });
    expect(result.injuries[0]).toMatchObject({ name: 'Tobillo', latestPain: 5 });
    expect(result.weight).toMatchObject({ latestKg: 79, change28dKg: -1 });
    expect(result.missingData).toEqual([]);
  });
});
