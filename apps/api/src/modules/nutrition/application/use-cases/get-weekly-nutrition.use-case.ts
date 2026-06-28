import { Inject, Injectable } from '@nestjs/common';
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
export class GetWeeklyNutritionUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repo: NutritionRepositoryPort,
    @Inject(NUTRITION_GOAL_REPOSITORY)
    private readonly goalRepo: NutritionGoalRepositoryPort,
  ) {}

  async execute(userId: string) {
    // Build last 7 days (oldest first) using UTC dates
    const days: { date: string; calories: number; protein: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, calories: 0, protein: 0 });
    }

    const from = new Date(`${days[0].date}T00:00:00.000Z`);
    const to   = new Date(`${days[days.length - 1].date}T23:59:59.999Z`);

    const [entries, goal] = await Promise.all([
      this.repo.findByDateRange(userId, from, to),
      this.goalRepo.findByUser(userId),
    ]);

    const proteinTarget = goal?.proteinTarget ?? DEFAULT_PROTEIN_TARGET;
    const caloriesTarget = goal?.caloriesTarget ?? DEFAULT_CALORIES_TARGET;

    for (const entry of entries) {
      const dateStr = entry.consumedAt.toISOString().split('T')[0];
      const day = days.find((d) => d.date === dateStr);
      if (day) {
        day.calories += entry.calories;
        day.protein += entry.proteinGrams;
      }
    }

    const loggedDays = days.filter((d) => d.calories > 0);
    const avgCalories =
      loggedDays.length > 0
        ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length)
        : 0;
    const avgProtein =
      loggedDays.length > 0
        ? Number((loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length).toFixed(1))
        : 0;
    const daysHittingProtein = loggedDays.filter((d) => d.protein >= proteinTarget).length;

    return {
      avgCalories,
      avgProtein,
      caloriesTarget,
      proteinTarget,
      daysHittingProtein,
      totalLoggedDays: loggedDays.length,
      dailyData: days.map((d) => ({
        date: d.date,
        calories: Math.round(d.calories),
        protein: Number(d.protein.toFixed(1)),
      })),
    };
  }
}
