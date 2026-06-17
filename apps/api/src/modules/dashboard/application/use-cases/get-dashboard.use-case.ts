import { Injectable } from '@nestjs/common';
import { GetActivitySummaryUseCase } from '../../../activity/application/use-cases/get-activity-summary.use-case';
import { GetInjurySummaryUseCase } from '../../../injury/application/use-cases/get-injury-summary.use-case';
import { GetNutritionSummaryUseCase } from '../../../nutrition/application/use-cases/get-nutrition-summary.use-case';
import { GetWeightSummaryUseCase } from '../../../weight/application/use-cases/get-weight-summary.use-case';

@Injectable()
export class GetDashboardUseCase {
  constructor(
    private readonly getWeightSummaryUseCase: GetWeightSummaryUseCase,
    private readonly getInjurySummaryUseCase: GetInjurySummaryUseCase,
    private readonly getNutritionSummaryUseCase: GetNutritionSummaryUseCase,
    private readonly getActivitySummaryUseCase: GetActivitySummaryUseCase,
  ) {}

  async execute(userId: string) {
    const [weight, injury, nutrition, activities] = await Promise.all([
      this.getWeightSummaryUseCase.execute(userId),
      this.getInjurySummaryUseCase.execute(userId),
      this.getNutritionSummaryUseCase.execute(userId),
      this.getActivitySummaryUseCase.execute(userId),
    ]);

    const weeklyAiSummary = [
      injury.weeklyAveragePain !== null
        ? `Dolor medio semanal ${injury.weeklyAveragePain}/10.`
        : 'Sin datos de lesion todavia.',
      nutrition.averageProtein !== null
        ? `Proteina media ${nutrition.averageProtein} g.`
        : 'Aun no hay comidas registradas.',
      activities.totalMinutes > 0
        ? `Has acumulado ${activities.totalMinutes} min de actividad en 7 dias.`
        : 'Todavia no hay actividad registrada.',
    ].join(' ');

    return {
      weight,
      injury,
      nutrition,
      activities,
      weeklyAiSummary,
    };
  }
}
