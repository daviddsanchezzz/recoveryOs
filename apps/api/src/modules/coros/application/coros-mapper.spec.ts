import { parseDailyHealthData, parseSleepData, parseSleepHrv, parseRestingHeartRate } from './coros-mapper';

describe('parseDailyHealthData (verified against the real Fase 0 spike sample)', () => {
  it('extracts steps, calories, and stress from the real sample text', () => {
    const text = 'Steps: 11,358 | Calories: 472 kcal | Exercise: 5 min\nStress: Avg 29 (Normal)';
    expect(parseDailyHealthData(text)).toEqual({ steps: 11358, activeCalories: 472, stressAvg: 29 });
  });

  it('returns nulls for fields missing from the text', () => {
    expect(parseDailyHealthData('No usable data today.')).toEqual({
      steps: null,
      activeCalories: null,
      stressAvg: null,
    });
  });
});

describe('parseSleepData (UNVERIFIED — synthetic sample, see Task 14)', () => {
  it('extracts duration and score from an assumed-format sample', () => {
    const text = 'Sleep Score: 82 | Duration: 7h 12m | Deep: 1h 30m | Light: 4h 20m';
    expect(parseSleepData(text)).toEqual({ durationH: 7.2, score: 82 });
  });

  it('returns nulls when the text does not match', () => {
    expect(parseSleepData('unexpected format')).toEqual({ durationH: null, score: null });
  });
});

describe('parseSleepHrv (UNVERIFIED — synthetic sample, see Task 14)', () => {
  it('extracts HRV from an assumed-format sample', () => {
    expect(parseSleepHrv('Overnight HRV: 45 ms (Balanced)')).toEqual({ hrv: 45 });
  });

  it('returns null when the text does not match', () => {
    expect(parseSleepHrv('unexpected format')).toEqual({ hrv: null });
  });
});

describe('parseRestingHeartRate (UNVERIFIED — synthetic sample, see Task 14)', () => {
  it('extracts resting HR from an assumed-format sample', () => {
    expect(parseRestingHeartRate('Resting HR: 52 bpm (7-day avg: 54 bpm)')).toEqual({ restingHeartRate: 52 });
  });

  it('returns null when the text does not match', () => {
    expect(parseRestingHeartRate('unexpected format')).toEqual({ restingHeartRate: null });
  });
});
