import { BadRequestException } from '@nestjs/common';
import { sanitizeStructuredGoals } from './save-structured-goals.use-case';

describe('sanitizeStructuredGoals', () => {
  it('keeps valid goals', () => {
    expect(sanitizeStructuredGoals([{ type: 'steps_daily', enabled: true, target: 9000 }])).toEqual([
      { type: 'steps_daily', enabled: true, target: 9000 },
    ]);
  });

  it('drops unknown types, bad targets and non-objects', () => {
    const result = sanitizeStructuredGoals([
      { type: 'hack', enabled: true, target: 1 },
      { type: 'steps_daily', enabled: true, target: -5 },
      { type: 'sleep_hours_daily', enabled: true, target: 'abc' },
      null,
      'x',
      { type: 'active_calories_daily', enabled: 'yes', target: 700 },
    ]);
    expect(result).toEqual([{ type: 'active_calories_daily', enabled: false, target: 700 }]);
  });

  it('keeps one entry per type (last wins)', () => {
    const result = sanitizeStructuredGoals([
      { type: 'steps_daily', enabled: true, target: 8000 },
      { type: 'steps_daily', enabled: false, target: 12000 },
    ]);
    expect(result).toEqual([{ type: 'steps_daily', enabled: false, target: 12000 }]);
  });

  it('rejects non-arrays', () => {
    expect(() => sanitizeStructuredGoals({})).toThrow(BadRequestException);
  });
});
