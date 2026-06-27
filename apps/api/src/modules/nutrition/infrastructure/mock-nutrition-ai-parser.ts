import { Injectable } from '@nestjs/common';
import { MealType } from '../domain/meal-types';
import { NutritionAiParserPort, ParsedMealResult } from '../domain/nutrition-ai-parser.port';

@Injectable()
export class MockNutritionAiParser implements NutritionAiParserPort {
  async parseMeal(text: string, date: Date): Promise<ParsedMealResult> {
    const hour = date.getHours();
    const mealType: MealType =
      hour < 10 ? 'breakfast' :
      hour < 14 ? 'lunch' :
      hour < 18 ? 'snack' : 'dinner';

    return {
      mealType,
      description: text.length > 50 ? text.slice(0, 47) + '...' : text,
      rawText: text,
      caloriesEstimate: 500,
      proteinEstimate: 25,
      carbsEstimate: 60,
      fatEstimate: 15,
      quality: 'medium',
      confidence: 'low',
      explanation: 'Estimación mock para desarrollo. Configura OPENAI_API_KEY para estimaciones reales.',
    };
  }
}
