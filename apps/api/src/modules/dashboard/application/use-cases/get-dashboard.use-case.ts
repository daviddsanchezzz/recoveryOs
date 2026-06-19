import { Injectable } from '@nestjs/common';
import { GetActivitySummaryUseCase } from '../../../activity/application/use-cases/get-activity-summary.use-case';
import { GetUserInjuriesUseCase } from '../../../injury/application/use-cases/get-user-injuries.use-case';
import { GetNutritionSummaryUseCase } from '../../../nutrition/application/use-cases/get-nutrition-summary.use-case';
import { GetWeightSummaryUseCase } from '../../../weight/application/use-cases/get-weight-summary.use-case';

@Injectable()
export class GetDashboardUseCase {
  constructor(
    private readonly getWeightSummaryUseCase: GetWeightSummaryUseCase,
    private readonly getUserInjuriesUseCase: GetUserInjuriesUseCase,
    private readonly getNutritionSummaryUseCase: GetNutritionSummaryUseCase,
    private readonly getActivitySummaryUseCase: GetActivitySummaryUseCase,
  ) {}

  async execute(userId: string) {
    const [weight, injuries, nutrition, activities] = await Promise.all([
      this.getWeightSummaryUseCase.execute(userId),
      this.getUserInjuriesUseCase.execute(userId),
      this.getNutritionSummaryUseCase.execute(userId),
      this.getActivitySummaryUseCase.execute(userId),
    ]);

    const activeInjuries = injuries.filter((i) => i.status === 'active' || i.status === 'recovering');
    const injurySummary = {
      activeCount: activeInjuries.length,
      names: activeInjuries.map((i) => i.name),
    };

    const weeklyAiSummary = [
      activeInjuries.length > 0
        ? `Lesiones activas: ${activeInjuries.map((i) => i.name).join(', ')}.`
        : 'Sin lesiones activas.',
      nutrition.averageProtein !== null
        ? `Proteina media ${nutrition.averageProtein} g.`
        : 'Aun no hay comidas registradas.',
      activities.totalMinutes > 0
        ? `Has acumulado ${activities.totalMinutes} min de actividad en 7 dias.`
        : 'Todavia no hay actividad registrada.',
    ].join(' ');

    return {
      weight,
      injury: injurySummary,
      nutrition,
      activities,
      weeklyAiSummary,
    };
  }
}
