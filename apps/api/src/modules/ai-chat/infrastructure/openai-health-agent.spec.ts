import { HealthContext } from '../domain/health-context';
import { OpenAiHealthAgent } from './openai-health-agent';

function response(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    intent: 'advice',
    reply: 'Hoy conviene una sesión suave.',
    confidence: 0.9,
    date: '2026-09-09',
    weightKg: null,
    injuryName: null,
    painLevel: null,
    didRehab: null,
    calories: null,
    proteinGrams: null,
    carbsGrams: null,
    fatGrams: null,
    activityType: null,
    durationMin: null,
    distanceKm: null,
    notes: null,
    ...overrides,
  });
}

describe('OpenAiHealthAgent', () => {
  it('returns grounded advice from a structured response', async () => {
    const agent = new OpenAiHealthAgent();
    const create = jest.fn().mockResolvedValue({ output_text: response() });
    (agent as unknown as { client: { responses: { create: typeof create } } }).client = {
      responses: { create },
    };

    const result = await agent.respond({
      message: '¿Cómo estoy?',
      date: '2026-09-09',
      context: {} as HealthContext,
    });

    expect(result).toEqual({ intent: 'advice', reply: 'Hoy conviene una sesión suave.', confidence: 0.9 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ store: false }));
  });

  it('maps an activity only when confidence and required data are present', async () => {
    const agent = new OpenAiHealthAgent();
    const create = jest.fn().mockResolvedValue({
      output_text: response({
        intent: 'activity',
        reply: 'He guardado tu carrera.',
        confidence: 0.95,
        activityType: 'run',
        durationMin: 45,
        distanceKm: 8,
      }),
    });
    (agent as unknown as { client: { responses: { create: typeof create } } }).client = {
      responses: { create },
    };

    const result = await agent.respond({
      message: 'He corrido 8 km en 45 minutos',
      date: '2026-09-09',
      context: {} as HealthContext,
    });

    expect(result.intent).toBe('activity');
    if (result.intent === 'activity') {
      expect(result.payload).toMatchObject({ type: 'run', durationMin: 45, distanceKm: 8 });
      expect(result.payload.performedAt.toISOString()).toBe('2026-09-09T12:00:00.000Z');
    }
  });
});
