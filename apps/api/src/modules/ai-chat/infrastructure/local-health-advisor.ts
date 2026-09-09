import { Injectable } from '@nestjs/common';
import { HealthAdvisorPort } from '../domain/health-advisor.port';
import { HealthContext } from '../domain/health-context';

function formatHours(hours: number) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours} h ${minutes.toString().padStart(2, '0')} min`;
}

@Injectable()
export class LocalHealthAdvisor implements HealthAdvisorPort {
  readonly provider = 'local' as const;

  async advise(input: { message: string; context: HealthContext }): Promise<string> {
    const { context } = input;
    const evidence: string[] = [];
    let cautionSignals = 0;

    if (context.sleep.today) {
      const sleep = context.sleep.today;
      evidence.push(
        `has dormido ${formatHours(sleep.durationH)}${sleep.score !== null ? ` con puntuación ${sleep.score}/100` : ''}`,
      );
      if (sleep.durationH < 6.5 || (sleep.score !== null && sleep.score < 60)) cautionSignals += 1;
    }

    const recovery = context.recovery.today;
    if (recovery?.recoveryPct !== null && recovery?.recoveryPct !== undefined) {
      evidence.push(`tu recuperación está en ${recovery.recoveryPct}%`);
      if (recovery.recoveryPct < 50) cautionSignals += 1;
    }
    if (context.recovery.hrvChangePct !== null) {
      evidence.push(`tu HRV está ${Math.abs(context.recovery.hrvChangePct)}% ${context.recovery.hrvChangePct < 0 ? 'por debajo' : 'por encima'} de tu referencia`);
      if (context.recovery.hrvChangePct <= -15) cautionSignals += 1;
    }
    if (context.recovery.restingHeartRateChangePct !== null) {
      evidence.push(`tu pulso en reposo está ${Math.abs(context.recovery.restingHeartRateChangePct)}% ${context.recovery.restingHeartRateChangePct > 0 ? 'por encima' : 'por debajo'} de tu referencia`);
      if (context.recovery.restingHeartRateChangePct >= 10) cautionSignals += 1;
    }

    const painfulInjury = context.injuries.find((injury) => (injury.latestPain ?? 0) >= 5);
    if (painfulInjury) {
      evidence.push(`${painfulInjury.name} tiene dolor ${painfulInjury.latestPain}/10`);
      cautionSignals += 2;
    } else if (context.injuries.length) {
      evidence.push(`tienes ${context.injuries.length} lesión en seguimiento`);
      cautionSignals += 1;
    }

    if (context.activity.loadChangePct !== null && context.activity.loadChangePct >= 30) {
      evidence.push(`tu volumen semanal ha aumentado un ${context.activity.loadChangePct}%`);
      cautionSignals += 1;
    } else {
      evidence.push(`acumulas ${context.activity.last7d.durationMin} min de actividad en 7 días`);
    }

    let recommendation: string;
    if (cautionSignals >= 3) {
      recommendation = 'Hoy priorizaría descanso o recuperación activa muy suave. Evitaría una sesión intensa y volvería a valorar sensaciones más tarde.';
    } else if (cautionSignals >= 1) {
      recommendation = 'Hoy elegiría una sesión suave o moderada, sin buscar máximos. Reduce la carga si las sensaciones empeoran durante el calentamiento.';
    } else if (evidence.length >= 3) {
      recommendation = 'Los datos disponibles no muestran una señal clara para frenar. Puedes seguir con tu sesión prevista, ajustándola a tus sensaciones.';
    } else {
      recommendation = 'No hay datos suficientes para recomendar intensidad con confianza. Haría una sesión conservadora y registraría sueño, HRV y sensaciones.';
    }

    const basis = evidence.length
      ? `Me baso en que ${evidence.slice(0, 5).join('; ')}.`
      : 'Todavía no tengo registros suficientes para evaluar tu estado.';
    const missing = context.missingData.length
      ? ` Me faltan: ${context.missingData.join(', ')}.`
      : '';

    return `${recommendation}\n\n${basis}${missing}\n\nEsto es orientación basada en tus registros, no un diagnóstico. Si tienes dolor fuerte, síntomas nuevos o te encuentras mal, no entrenes y consulta a un profesional.`;
  }
}
