import OpenAI from 'openai';
import { HealthAdvisorPort } from '../domain/health-advisor.port';
import { HealthContext } from '../domain/health-context';

export class OpenAiHealthAdvisor implements HealthAdvisorPort {
  readonly provider = 'openai' as const;
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async advise(input: { message: string; context: HealthContext }): Promise<string> {
    const response = await this.client.responses.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
      store: false,
      max_output_tokens: 700,
      instructions:
        'Eres el asesor personal de salud y rendimiento de RecoveryOS. Responde en español, claro y breve. Usa exclusivamente los datos proporcionados, cita cifras y fechas, distingue hechos de inferencias y menciona datos ausentes. Los minutos de actividad son solo una aproximación de carga y los datos nutricionales del día pueden estar incompletos. Da una recomendación práctica y prudente. No diagnostiques. Ante dolor fuerte o síntomas preocupantes, recomienda parar y consultar a un profesional.',
      input: `Pregunta del usuario: ${input.message}\n\nDatos verificados de RecoveryOS:\n${JSON.stringify(input.context)}`,
    });

    const reply = response.output_text.trim();
    if (!reply) throw new Error('OpenAI returned an empty health recommendation');
    return reply;
  }
}
