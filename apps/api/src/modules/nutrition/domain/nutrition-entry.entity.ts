import { Confidence, MealSource, MealType, Quality } from './meal-types';

export class NutritionEntryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly consumedAt: Date,
    public readonly rawText: string,
    public readonly calories: number,
    public readonly proteinGrams: number,
    public readonly carbsGrams: number,
    public readonly fatGrams: number,
    public readonly mealType: MealType = 'snack',
    public readonly description: string | null = null,
    public readonly quality: Quality = 'medium',
    public readonly confidence: Confidence = 'medium',
    public readonly source: MealSource = 'manual',
  ) {}
}
