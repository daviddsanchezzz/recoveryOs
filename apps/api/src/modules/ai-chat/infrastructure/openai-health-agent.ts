import { ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import { getOpenAiApiKey, getOpenAiModel } from '../../../shared/infrastructure/openai/openai-config';
import { HealthAgentPort, HealthAgentResult } from '../domain/health-agent.port';
import { HealthContext } from '../domain/health-context';

type AgentJson = {
  intent: 'advice' | 'clarification' | 'weight' | 'injury' | 'nutrition' | 'activity';
  reply: string;
  confidence: number;
  date: string;
  weightKg: number | null;
  injuryName: string | null;
  painLevel: number | null;
  didRehab: boolean | null;
  calories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  activityType: string | null;
  durationMin: number | null;
  distanceKm: number | null;
  notes: string | null;
};

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    intent: { type: 'string', enum: ['advice', 'clarification', 'weight', 'injury', 'nutrition', 'activity'] },
    reply: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    date: { type: 'string', description: 'Fecha ISO YYYY-MM-DD' },
    weightKg: { type: ['number', 'null'], minimum: 20, maximum: 500 },
    injuryName: { type: ['string', 'null'] },
    painLevel: { type: ['integer', 'null'], minimum: 0, maximum: 10 },
    didRehab: { type: ['boolean', 'null'] },
    calories: { type: ['integer', 'null'], minimum: 0, maximum: 10000 },
    proteinGrams: { type: ['number', 'null'], minimum: 0, maximum: 1000 },
    carbsGrams: { type: ['number', 'null'], minimum: 0, maximum: 2000 },
    fatGrams: { type: ['number', 'null'], minimum: 0, maximum: 1000 },
    activityType: { type: ['string', 'null'], enum: ['run', 'walk', 'bike', 'swim', 'gym', 'mobility', 'rehab', 'other', null] },
    durationMin: { type: ['number', 'null'], minimum: 1, maximum: 1440 },
    distanceKm: { type: ['number', 'null'], minimum: 0, maximum: 1000 },
    notes: { type: ['string', 'null'] },
  },
  required: [
    'intent', 'reply', 'confidence', 'date', 'weightKg', 'injuryName', 'painLevel',
    'didRehab', 'calories', 'proteinGrams', 'carbsGrams', 'fatGrams', 'activityType',
    'durationMin', 'distanceKm', 'notes',
  ],
};

function dateAtNoon(date: string, fallback: string) {
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : fallback;
  const parsed = new Date(`${candidate}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${fallback}T12:00:00.000Z`) : parsed;
}

export class OpenAiHealthAgent implements HealthAgentPort {
  private readonly client: OpenAI | null;

  constructor() {
    const apiKey = getOpenAiApiKey();
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async respond(input: { message: string; date: string; context: HealthContext }): Promise<HealthAgentResult> {
    if (!this.client) throw new ServiceUnavailableException('OpenAI no está configurado');
    const response = await this.client.responses.create({
      model: getOpenAiModel(),
      store: false,
      max_output_tokens: 900,
      instructions:
        'Eres el agente personal de salud y rendimiento de RecoveryOS. Responde siempre en español y usa solo los datos verificados recibidos. Puedes aconsejar o interpretar solicitudes para registrar peso, dolor/rehab, comida o actividad. Si faltan datos para guardar, pide aclaración: nunca inventes. Cita cifras al aconsejar, separa hechos de inferencias y sé prudente. No diagnostiques; ante síntomas preocupantes recomienda parar y consultar a un profesional.',
      input: `Fecha seleccionada: ${input.date}\nMensaje: ${input.message}\n\nDatos verificados de RecoveryOS:\n${JSON.stringify(input.context)}`,
      text: {
        format: {
          type: 'json_schema',
          name: 'recoveryos_health_agent',
          strict: true,
          schema,
        },
      },
    });

    if (!response.output_text) throw new ServiceUnavailableException('OpenAI no devolvió una respuesta');
    const parsed = JSON.parse(response.output_text) as AgentJson;
    const confidence = Math.max(0, Math.min(1, parsed.confidence));

    if (parsed.intent === 'advice' || parsed.intent === 'clarification') {
      return { intent: parsed.intent, reply: parsed.reply, confidence };
    }
    if (confidence < 0.75) {
      return {
        intent: 'clarification',
        reply: parsed.reply || 'Necesito algún dato más antes de guardar eso.',
        confidence,
      };
    }
    if (parsed.intent === 'weight' && parsed.weightKg !== null) {
      return {
        intent: 'weight', reply: parsed.reply, confidence,
        payload: { weightKg: parsed.weightKg, date: dateAtNoon(parsed.date, input.date) },
      };
    }
    if (parsed.intent === 'injury' && parsed.painLevel !== null && parsed.didRehab !== null) {
      return {
        intent: 'injury', reply: parsed.reply, confidence,
        payload: {
          injuryName: parsed.injuryName,
          painLevel: parsed.painLevel,
          didRehab: parsed.didRehab,
          notes: parsed.notes ?? undefined,
          date: dateAtNoon(parsed.date, input.date),
        },
      };
    }
    if (
      parsed.intent === 'nutrition' && parsed.calories !== null && parsed.proteinGrams !== null &&
      parsed.carbsGrams !== null && parsed.fatGrams !== null
    ) {
      return {
        intent: 'nutrition', reply: parsed.reply, confidence,
        payload: {
          consumedAt: dateAtNoon(parsed.date, input.date),
          rawText: input.message,
          calories: parsed.calories,
          proteinGrams: parsed.proteinGrams,
          carbsGrams: parsed.carbsGrams,
          fatGrams: parsed.fatGrams,
        },
      };
    }
    if (parsed.intent === 'activity' && parsed.activityType && parsed.durationMin !== null) {
      return {
        intent: 'activity', reply: parsed.reply, confidence,
        payload: {
          type: parsed.activityType,
          durationMin: parsed.durationMin,
          distanceKm: parsed.distanceKm ?? undefined,
          notes: parsed.notes ?? undefined,
          performedAt: dateAtNoon(parsed.date, input.date),
        },
      };
    }

    return {
      intent: 'clarification',
      reply: 'Necesito algún dato más antes de guardar eso. ¿Puedes concretarlo?',
      confidence,
    };
  }
}
