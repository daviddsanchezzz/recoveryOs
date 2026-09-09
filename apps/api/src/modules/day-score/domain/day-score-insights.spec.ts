import { buildDayScoreInsight } from './day-score-insights';

describe('buildDayScoreInsight', () => {
  it('matches the mockup case: low HRV + high load', () => {
    const result = buildDayScoreInsight({ sleepScore: 70, hrvScore: 30, painScore: 90, loadStatus: 'alta' });
    expect(result.explanation).toBe('Tu HRV esta algo por debajo de tu media tras la carga alta de ayer.');
    expect(result.tip).toBe('Carga alta - prioriza descanso o una sesion muy suave hoy.');
  });

  it('matches the mockup case: normal load with a soft flag -> "carga moderada" tip', () => {
    const result = buildDayScoreInsight({ sleepScore: 70, hrvScore: 45, painScore: 90, loadStatus: 'normal' });
    expect(result.tip).toBe('Carga moderada - evita impacto y manten la bici suave.');
  });

  it('falls back to the all-good message when every signal is in range', () => {
    const result = buildDayScoreInsight({ sleepScore: 80, hrvScore: 60, painScore: 90, loadStatus: 'normal' });
    expect(result.explanation).toBe('Tus metricas estan en linea con tu media habitual.');
    expect(result.tip).toBe('Sigue con tu plan habitual.');
  });

  it('handles all-null components without throwing', () => {
    const result = buildDayScoreInsight({ sleepScore: null, hrvScore: null, painScore: null, loadStatus: null });
    expect(result.explanation).toBe('Tus metricas estan en linea con tu media habitual.');
    expect(result.tip).toBe('Sigue con tu plan habitual.');
  });

  it('flags low pain score before falling back', () => {
    const result = buildDayScoreInsight({ sleepScore: 80, hrvScore: 60, painScore: 30, loadStatus: 'normal' });
    expect(result.explanation).toBe('El dolor ha estado mas presente que de costumbre.');
  });
});
