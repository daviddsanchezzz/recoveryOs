import {
  computeSessionLoad, computeDailyLoad, computeAcuteChronicRatio, loadScoreFromRatio, loadStatusFromRatio,
  sleepScoreFromEntry, hrvScoreFromValues, painScoreFromLogs, combineWeightedScore, scoreLabel,
} from './day-score-math';

describe('computeSessionLoad', () => {
  it('weights duration by HR intensity when both HR values are present', () => {
    expect(computeSessionLoad(60, 120, 60)).toBe(120); // 60 * (120/60)
  });

  it('falls back to plain duration when avgHeartRate is missing', () => {
    expect(computeSessionLoad(45, null, 60)).toBe(45);
  });

  it('falls back to plain duration when restingHeartRate is missing', () => {
    expect(computeSessionLoad(45, 130, null)).toBe(45);
  });
});

describe('computeDailyLoad', () => {
  it('sums session loads for the day', () => {
    const sessions = [
      { durationMin: 30, avgHeartRate: 120 },
      { durationMin: 20, avgHeartRate: null },
    ];
    // session1: 30*(120/60)=60, session2: 20 (fallback) => 80
    expect(computeDailyLoad(sessions, 60)).toBe(80);
  });

  it('returns 0 for a day with no sessions', () => {
    expect(computeDailyLoad([], 60)).toBe(0);
  });
});

describe('computeAcuteChronicRatio', () => {
  it('returns the ratio of the 7-day average to the 28-day average', () => {
    const last7 = [100, 100, 100, 100, 100, 100, 100]; // avg 100
    const last28 = new Array(28).fill(50); // avg 50
    expect(computeAcuteChronicRatio(last7, last28)).toBe(2);
  });

  it('returns null when there is no activity at all in the 28-day window', () => {
    expect(computeAcuteChronicRatio(new Array(7).fill(0), new Array(28).fill(0))).toBeNull();
  });
});

describe('loadScoreFromRatio', () => {
  it('scores 100 for a ratio in the ideal 0.8-1.3 range', () => {
    expect(loadScoreFromRatio(1.0)).toBe(100);
    expect(loadScoreFromRatio(0.8)).toBe(100);
    expect(loadScoreFromRatio(1.3)).toBe(100);
  });

  it('decays for overload above 1.3', () => {
    expect(loadScoreFromRatio(1.8)).toBe(0); // 100 - (1.8-1.3)*200 = 0
    expect(loadScoreFromRatio(1.55)).toBe(50); // 100 - (1.55-1.3)*200 = 50
  });

  it('decays gently for undertraining below 0.8, floored at 50', () => {
    expect(loadScoreFromRatio(0.5)).toBe(70); // 100 - (0.8-0.5)*100 = 70
    expect(loadScoreFromRatio(0)).toBe(50); // clamped: 100 - 0.8*100 = 20 -> floor 50
  });

  it('returns null when the ratio is null', () => {
    expect(loadScoreFromRatio(null)).toBeNull();
  });
});

describe('loadStatusFromRatio', () => {
  it('classifies alta/normal/baja/null', () => {
    expect(loadStatusFromRatio(1.5)).toBe('alta');
    expect(loadStatusFromRatio(1.0)).toBe('normal');
    expect(loadStatusFromRatio(0.5)).toBe('baja');
    expect(loadStatusFromRatio(null)).toBeNull();
  });
});

describe('sleepScoreFromEntry', () => {
  it('prefers the real COROS score when present', () => {
    expect(sleepScoreFromEntry({ score: 84, quality: 3 })).toBe(84);
  });

  it('derives a score from manual quality when score is absent', () => {
    expect(sleepScoreFromEntry({ score: null, quality: 4 })).toBe(80);
  });

  it('returns null when there is no entry', () => {
    expect(sleepScoreFromEntry(null)).toBeNull();
  });
});

describe('hrvScoreFromValues', () => {
  it('scores 50 (neutral) when today matches the 7-day baseline', () => {
    expect(hrvScoreFromValues(60, [60, 60, 60])).toBe(50);
  });

  it('scores above 50 when today is above baseline', () => {
    expect(hrvScoreFromValues(66, [60, 60, 60])).toBe(60); // ratio 1.1 -> 50 + 10
  });

  it('scores below 50 when today is below baseline', () => {
    expect(hrvScoreFromValues(54, [60, 60, 60])).toBe(40); // ratio 0.9 -> 50 - 10
  });

  it('returns null with fewer than 3 baseline values', () => {
    expect(hrvScoreFromValues(60, [60, 60])).toBeNull();
  });

  it('returns null when today has no HRV value', () => {
    expect(hrvScoreFromValues(null, [60, 60, 60])).toBeNull();
  });
});

describe('painScoreFromLogs', () => {
  it('scores 100 when there are no active injuries', () => {
    expect(painScoreFromLogs([], false)).toBe(100);
  });

  it('inverts average pain (0-10) to a 0-100 score', () => {
    expect(painScoreFromLogs([2], true)).toBe(80);
    expect(painScoreFromLogs([2, 4], true)).toBe(70);
  });

  it('returns null when injuries are active but nothing was logged today', () => {
    expect(painScoreFromLogs([], true)).toBeNull();
  });
});

describe('combineWeightedScore', () => {
  it('combines all 4 components with the spec weights', () => {
    // 70*25 + 40*30 + 90*25 + 50*20 = 6200 / 100 = 62
    expect(combineWeightedScore({ sleep: 70, hrv: 40, pain: 90, load: 50 })).toBe(62);
  });

  it('renormalizes weights when a component is missing', () => {
    // only sleep(25) + hrv(30) + pain(25) present, load missing -> weights renormalize over 80
    // (70*25 + 40*30 + 90*25) / 80 = (1750+1200+2250)/80 = 5200/80 = 65
    expect(combineWeightedScore({ sleep: 70, hrv: 40, pain: 90, load: null })).toBe(65);
  });

  it('returns null when every component is missing', () => {
    expect(combineWeightedScore({ sleep: null, hrv: null, pain: null, load: null })).toBeNull();
  });
});

describe('scoreLabel', () => {
  it('maps thresholds to labels, matching the 62 -> "Bastante bien" mockup case', () => {
    expect(scoreLabel(90)).toBe('Excelente');
    expect(scoreLabel(75)).toBe('Muy bien');
    expect(scoreLabel(62)).toBe('Bastante bien');
    expect(scoreLabel(45)).toBe('Regular');
    expect(scoreLabel(20)).toBe('Cuidado');
  });
});
