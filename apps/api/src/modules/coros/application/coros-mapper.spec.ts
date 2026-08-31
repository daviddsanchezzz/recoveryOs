import { parseDailyHealthData, parseSleepData, parseSleepHrv, parseRestingHeartRate } from './coros-mapper';

// Sample text below is trimmed/redacted from the real fixtures captured against the live COROS
// MCP server (scripts/coros-mcp-spike/fixtures/*.json) — structure and field wording verbatim,
// with personal values rounded to nearby round numbers. All four tools return a multi-day
// window regardless of the date arg passed, so every test here asserts that the parser picks
// out the requested day's section rather than "whichever day comes first in the blob".

describe('parseDailyHealthData (verified against real fixture: queryDailyHealthData)', () => {
  const text = [
    '--- 20260830 ---',
    'Steps: 1,500 | Calories: 125 kcal | Exercise: 1 min',
    'Stress: Avg 46',
    '',
    '--- 20260831 ---',
    'Steps: 100 | Calories: 25 kcal | Exercise: 0 min',
    'Stress: Avg 27',
  ].join('\n');

  it('extracts the requested day, not the first day in the blob', () => {
    expect(parseDailyHealthData(text, '2026-08-31')).toEqual({ steps: 100, activeCalories: 25, stressAvg: 27 });
  });

  it('extracts a different day correctly when it is the earlier section', () => {
    expect(parseDailyHealthData(text, '2026-08-30')).toEqual({ steps: 1500, activeCalories: 125, stressAvg: 46 });
  });

  it('returns nulls when the target date section is absent', () => {
    expect(parseDailyHealthData(text, '2026-01-01')).toEqual({ steps: null, activeCalories: null, stressAvg: null });
  });
});

describe('parseSleepData (verified against real fixture: querySleepData)', () => {
  const text = [
    '2026-08-30',
    'Sleep Score: 84',
    'Main Sleep: 6h 36min',
    'Deep Sleep Ratio: 31%',
    '',
    '2026-08-31',
    'Sleep Score: 83',
    'Main Sleep: 10h 36min',
    'Deep Sleep Ratio: 22%',
  ].join('\n');

  it('extracts the requested day, not the first day in the blob, using "Main Sleep:" not "Duration:"', () => {
    expect(parseSleepData(text, '2026-08-31')).toEqual({ durationH: 10.6, score: 83 });
  });

  it('extracts a different day correctly when it is the earlier section', () => {
    expect(parseSleepData(text, '2026-08-30')).toEqual({ durationH: 6.6, score: 84 });
  });

  it('returns nulls when the target date section is absent', () => {
    expect(parseSleepData(text, '2026-01-01')).toEqual({ durationH: null, score: null });
  });
});

describe('parseSleepHrv (verified against real fixture: querySleepHrv)', () => {
  const text = [
    'HRV Assessment — Last 7 days',
    '========================',
    '',
    '2026-08-31:',
    '  HRV Avg: 78 ms — Above normal',
    '  Normal Range: 59 - 71 ms',
    '  Baseline: 65 ms',
    '2026-08-30:',
    '  HRV Avg: 76 ms — Above normal',
    '  Normal Range: 58 - 70 ms',
    '  Baseline: 64 ms',
    '2026-08-25:',
    '  No data',
    '',
    'Sleep HRV Time Series — Last 7 days',
    '========================',
    '',
    '2026-08-30:',
    '  timestamp=1788077390, timezone=8, hrv=999 ms, status=4, confidence=86206',
    '2026-08-31:',
    '  timestamp=1788129290, timezone=8, hrv=999 ms, status=4, confidence=100000',
  ].join('\n');

  it('extracts the requested day from the Assessment section, not the Time Series section', () => {
    expect(parseSleepHrv(text, '2026-08-31')).toEqual({ hrv: 78 });
  });

  it('extracts a different day correctly, ignoring the other day and the time series values', () => {
    expect(parseSleepHrv(text, '2026-08-30')).toEqual({ hrv: 76 });
  });

  it('returns { hrv: null } for a day that says "No data", without throwing', () => {
    expect(parseSleepHrv(text, '2026-08-25')).toEqual({ hrv: null });
  });

  it('returns { hrv: null } when the target date is absent entirely', () => {
    expect(parseSleepHrv(text, '2026-01-01')).toEqual({ hrv: null });
  });
});

describe('parseRestingHeartRate (verified against real fixture: queryRestingHeartRate)', () => {
  const text = ['2026-08-31: 59 bpm', '2026-08-30: 61 bpm'].join('\n');

  it('extracts the requested day, not the first line in the blob', () => {
    expect(parseRestingHeartRate(text, '2026-08-30')).toEqual({ restingHeartRate: 61 });
  });

  it('extracts a different day correctly when it is the earlier line', () => {
    expect(parseRestingHeartRate(text, '2026-08-31')).toEqual({ restingHeartRate: 59 });
  });

  it('returns null when the target date is absent', () => {
    expect(parseRestingHeartRate(text, '2026-01-01')).toEqual({ restingHeartRate: null });
  });
});
