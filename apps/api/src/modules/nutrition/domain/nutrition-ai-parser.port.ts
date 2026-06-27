import { Confidence, MealType, Quality } from './meal-types';

export interface ParsedMealResult {
  mealType: MealType;
  description: string;
  rawText: string;
  caloriesEstimate: number;
  proteinEstimate: number;
  carbsEstimate: number;
  fatEstimate: number;
  quality: Quality;
  confidence: Confidence;
  explanation: string;
}

export const NUTRITION_AI_PARSER = Symbol('NUTRITION_AI_PARSER');

export interface NutritionAiParserPort {
  parseMeal(text: string, date: Date): Promise<ParsedMealResult>;
}
