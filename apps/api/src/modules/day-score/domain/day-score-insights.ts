export interface DayScoreInsightInput {
  sleepScore: number | null;
  hrvScore: number | null;
  painScore: number | null;
  loadStatus: 'alta' | 'normal' | 'baja' | null;
}

function buildExplanation(input: DayScoreInsightInput): string {
  const { sleepScore, hrvScore, painScore, loadStatus } = input;

  if (hrvScore !== null && hrvScore < 40 && loadStatus === 'alta') {
    return 'Tu HRV está algo por debajo de tu media tras la carga alta de ayer.';
  }
  if (hrvScore !== null && hrvScore < 40) {
    return 'Tu HRV está por debajo de tu media estos días.';
  }
  if (painScore !== null && painScore < 50) {
    return 'El dolor ha estado más presente que de costumbre.';
  }
  if (sleepScore !== null && sleepScore < 50) {
    return 'Has dormido menos de lo habitual.';
  }
  if (loadStatus === 'alta') {
    return 'Vienes de días de carga alta.';
  }
  if (loadStatus === 'baja') {
    return 'Los ultimos dias has entrenado menos de lo habitual.';
  }
  return 'Tus métricas están en línea con tu media habitual.';
}

function buildTip(input: DayScoreInsightInput): string {
  const { sleepScore, hrvScore, painScore, loadStatus } = input;

  if (loadStatus === 'alta') {
    return 'Carga alta: prioriza descanso o una sesión muy suave hoy.';
  }
  if (loadStatus === 'normal' && ((hrvScore !== null && hrvScore < 50) || (painScore !== null && painScore < 60))) {
    return 'Carga moderada: evita impacto y mantén la bici suave.';
  }
  if (loadStatus === 'baja') {
    return 'Carga baja: buen momento para retomar intensidad si te sientes bien.';
  }
  if (sleepScore !== null && sleepScore < 50) {
    return 'Prioriza dormir más esta noche.';
  }
  return 'Sigue con tu plan habitual.';
}

export function buildDayScoreInsight(input: DayScoreInsightInput): { explanation: string; tip: string } {
  return {
    explanation: buildExplanation(input),
    tip: buildTip(input),
  };
}
