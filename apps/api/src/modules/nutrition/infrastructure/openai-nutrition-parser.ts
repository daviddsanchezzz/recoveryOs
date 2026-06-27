import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Confidence, MealType, Quality } from '../domain/meal-types';
import { NutritionAiParserPort, ParsedMealResult } from '../domain/nutrition-ai-parser.port';

@Injectable()
export class OpenAiNutritionParser implements NutritionAiParserPort {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async parseMeal(text: string, date: Date): Promise<ParsedMealResult> {
    const hour = date.getHours();
    const timeHint =
      hour < 10 ? 'mañana (desayuno)' :
      hour < 14 ? 'mediodía (comida)' :
      hour < 18 ? 'tarde (merienda)' : 'noche (cena)';

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Eres un nutricionista experto en comida española. Devuelve SOLO JSON con esta estructura:
{
  "mealType": "breakfast|lunch|snack|dinner|extra",
  "description": "nombre corto del plato en español (máx 60 caracteres)",
  "caloriesEstimate": número_entero,
  "proteinEstimate": número_entero_gramos,
  "carbsEstimate": número_entero_gramos,
  "fatEstimate": número_entero_gramos,
  "quality": "low|medium|high",
  "confidence": "low|medium|high",
  "explanation": "una frase corta explicando la estimación"
}

Reglas:
- mealType debe coincidir con la hora del día: ${timeHint}
- quality "high" = equilibrado, proteína suficiente, verduras; "low" = procesado, poco nutritivo
- confidence "high" = alimentos específicos y cantidades claras; "medium" = estimación razonable; "low" = descripción vaga
- Usa raciones estándar españolas: tupper = 400-600g, plato de pasta = 250g cocida, ración de pollo = 150g
- Si la descripción es vaga, usa confidence "low" y valores conservadores
- No inventes precisión falsa`,
        },
        {
          role: 'user',
          content: `Hora del día: ${timeHint}\n\n${text}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      parsed = {};
    }

    return {
      mealType: (parsed.mealType as MealType) ?? 'snack',
      description: (parsed.description as string) ?? text.slice(0, 60),
      rawText: text,
      caloriesEstimate: Number(parsed.caloriesEstimate) || 500,
      proteinEstimate: Number(parsed.proteinEstimate) || 20,
      carbsEstimate: Number(parsed.carbsEstimate) || 50,
      fatEstimate: Number(parsed.fatEstimate) || 15,
      quality: (parsed.quality as Quality) ?? 'medium',
      confidence: (parsed.confidence as Confidence) ?? 'low',
      explanation: (parsed.explanation as string) ?? '',
    };
  }
}
