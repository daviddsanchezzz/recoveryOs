import { Injectable } from '@nestjs/common';
import { AiIntentParserPort, ParsedChatIntent } from '../domain/ai-intent-parser.port';

@Injectable()
export class MockAiIntentParser implements AiIntentParserPort {
  async parse(input: { userId: string; message: string; now: Date }): Promise<ParsedChatIntent> {
    const normalized = input.message.toLowerCase();

    const weightMatch = normalized.match(/(\d{2,3}(?:[.,]\d)?)\s?kg/);
    if (weightMatch) {
      return {
        type: 'weight',
        payload: {
          weightKg: Number(weightMatch[1].replace(',', '.')),
          date: input.now,
        },
        reply: 'He registrado tu peso y he actualizado la tendencia.',
      };
    }

    if (normalized.includes('duele') || normalized.includes('tobillo')) {
      return {
        type: 'injury',
        payload: {
          walkingPain: normalized.includes('poco') ? 3 : 5,
          stiffness: normalized.includes('rigido') ? 6 : 4,
          swelling: normalized.includes('hinchado'),
          rehabCompleted: normalized.includes('rehab') || normalized.includes('rehabilit'),
          notes: input.message,
          date: input.now,
        },
        reply: 'He guardado el estado del tobillo para seguir la evolucion de la lesion.',
      };
    }

    if (
      normalized.includes('he comido') ||
      normalized.includes('he cenado') ||
      normalized.includes('pizza') ||
      normalized.includes('tortilla')
    ) {
      const defaults = normalized.includes('pizza')
        ? { calories: 850, proteinGrams: 32, carbsGrams: 90, fatGrams: 34 }
        : { calories: 520, proteinGrams: 34, carbsGrams: 42, fatGrams: 18 };

      return {
        type: 'nutrition',
        payload: {
          consumedAt: input.now,
          rawText: input.message,
          ...defaults,
        },
        reply: 'He interpretado la comida y he guardado una estimacion nutricional.',
      };
    }

    if (normalized.includes('bici') || normalized.includes('caminado') || normalized.includes('km')) {
      const durationMatch = normalized.match(/(\d+)\s*min/);
      const distanceMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*km/);
      return {
        type: 'activity',
        payload: {
          type: normalized.includes('bici') ? 'bike' : 'walk',
          durationMin: durationMatch ? Number(durationMatch[1]) : 30,
          distanceKm: distanceMatch ? Number(distanceMatch[1].replace(',', '.')) : undefined,
        },
        reply: 'He registrado la actividad y la tendre en cuenta en tu carga semanal.',
      };
    }

    return {
      type: 'unknown',
      reply: 'Puedo registrar peso, nutricion, dolor del tobillo y actividad descritos en lenguaje natural.',
    };
  }
}
