import { Inject, Injectable } from '@nestjs/common';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../domain/nutrition-repository.port';

@Injectable()
export class GetNutritionSummaryUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repository: NutritionRepositoryPort,
  ) {}

  async execute(userId: string) {
    const entries = await this.repository.findByUser(userId);
    if (entries.length === 0) {
      return {
        averageCalories: null,
        averageProtein: null,
        entries: [],
      };
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyEntries = entries.filter((entry) => entry.consumedAt >= weekAgo);
    const relevantEntries = weeklyEntries.length > 0 ? weeklyEntries : entries;

    const totalCalories = relevantEntries.reduce((sum, entry) => sum + entry.calories, 0);
    const totalProtein = relevantEntries.reduce((sum, entry) => sum + entry.proteinGrams, 0);

    return {
      averageCalories: Math.round(totalCalories / relevantEntries.length),
      averageProtein: Number((totalProtein / relevantEntries.length).toFixed(1)),
      entries,
    };
  }
}
