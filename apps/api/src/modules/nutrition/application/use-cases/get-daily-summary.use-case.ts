import { Inject, Injectable } from '@nestjs/common';
import { MealType, REQUIRED_MEAL_TYPES } from '../../domain/meal-types';
import { NutritionEntryEntity } from '../../domain/nutrition-entry.entity';
import {
  NUTRITION_GOAL_REPOSITORY,
  NutritionGoalRepositoryPort,
} from '../../domain/nutrition-goal-repository.port';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../domain/nutrition-repository.port';

const DEFAULT_CALORIES_TARGET = 2300;
const DEFAULT_PROTEIN_TARGET = 150;

@Injectable()
export class GetDailySummaryUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repo: NutritionRepositoryPort,
    @Inject(NUTRITION_GOAL_REPOSITORY)
    private readonly goalRepo: NutritionGoalRepositoryPort,
  ) {}

  async execute(userId: string, date: string) {
    const [meals, goal] = await Promise.all([
      this.repo.findByDate(userId, date),
      this.goalRepo.findByUser(userId),
    ]);

    const caloriesTarget = goal?.caloriesTarget ?? DEFAULT_CALORIES_TARGET;
    const proteinTarget = goal?.proteinTarget ?? DEFAULT_PROTEIN_TARGET;

    const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
    const totalProtein = meals.reduce((s, m) => s + m.proteinGrams, 0);
    const totalCarbs = meals.reduce((s, m) => s + m.carbsGrams, 0);
    const totalFat = meals.reduce((s, m) => s + m.fatGrams, 0);

    const mealsByType = meals.reduce<Record<MealType, NutritionEntryEntity[]>>(
      (acc, m) => {
        acc[m.mealType] = [...(acc[m.mealType] ?? []), m];
        return acc;
      },
      {} as Record<MealType, NutritionEntryEntity[]>,
    );

    const loggedTypes = new Set(meals.map((m) => m.mealType));
    const missingMealTypes = REQUIRED_MEAL_TYPES.filter((t) => !loggedTypes.has(t));

    return {
      totalCalories,
      totalProtein: Number(totalProtein.toFixed(1)),
      totalCarbs: Number(totalCarbs.toFixed(1)),
      totalFat: Number(totalFat.toFixed(1)),
      caloriesTarget,
      proteinTarget,
      mealsCount: meals.length,
      meals,
      mealsByType,
      missingMealTypes,
      proteinProgressPercent: Math.round((totalProtein / proteinTarget) * 100),
      caloriesProgressPercent: Math.round((totalCalories / caloriesTarget) * 100),
    };
  }
}
