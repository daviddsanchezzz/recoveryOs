import { HealthContext } from '../domain/health-context';
import { LocalHealthAdvisor } from './local-health-advisor';

const context: HealthContext = {
  date: '2026-09-09',
  window: { from: '2026-08-13', to: '2026-09-09', days: 28 },
  sleep: {
    today: { durationH: 5.5, score: 45, quality: 2, source: 'coros' },
    averageDuration7d: 7.2,
    averageScore7d: 72,
    daysWithData7d: 7,
  },
  recovery: {
    today: { restingHeartRate: 68, hrv: 40, stressAvg: 60, recoveryPct: 35, steps: 0, activeCalories: 0 },
    baseline28d: { restingHeartRate: 60, hrv: 50, stressAvg: 35, recoveryPct: 70 },
    hrvChangePct: -20,
    restingHeartRateChangePct: 13.3,
    daysWithData28d: 20,
  },
  activity: {
    today: [],
    last7d: { sessions: 5, durationMin: 300, distanceKm: 30 },
    previous7d: { sessions: 3, durationMin: 200, distanceKm: 20 },
    loadChangePct: 50,
  },
  nutrition: {
    today: { calories: 0, proteinGrams: 0, meals: 0 },
    averageLoggedDay7d: null,
    daysWithData7d: 0,
    targets: null,
  },
  injuries: [],
  weight: { latestKg: null, latestDate: null, change28dKg: null },
  missingData: ['nutrición de los últimos 7 días'],
};

describe('LocalHealthAdvisor', () => {
  it('recommends recovery when several caution signals are present', async () => {
    const reply = await new LocalHealthAdvisor().advise({ message: '¿Entreno hoy?', context });

    expect(reply).toContain('descanso o recuperación activa');
    expect(reply).toContain('5 h 30 min');
    expect(reply).toContain('HRV está 20% por debajo');
    expect(reply).toContain('nutrición de los últimos 7 días');
  });
});
