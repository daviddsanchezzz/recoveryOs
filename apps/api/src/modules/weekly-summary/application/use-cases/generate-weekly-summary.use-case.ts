import { Injectable } from '@nestjs/common';
import { GetDashboardUseCase } from '../../../dashboard/application/use-cases/get-dashboard.use-case';

@Injectable()
export class GenerateWeeklySummaryUseCase {
  constructor(private readonly getDashboardUseCase: GetDashboardUseCase) {}

  async execute(userId: string) {
    const dashboard = await this.getDashboardUseCase.execute(userId);

    return {
      weekRange: 'Monday - Sunday',
      health: `Dolor medio: ${dashboard.injury.weeklyAveragePain ?? 'sin datos'}`,
      training: dashboard.activities,
      nutrition: {
        averageCalories: dashboard.nutrition.averageCalories,
        averageProtein: dashboard.nutrition.averageProtein,
      },
      weight: {
        currentWeightKg: dashboard.weight.currentWeightKg,
        monthlyChangeKg: dashboard.weight.monthlyChangeKg,
      },
      recommendations: [
        'Mantener la rehabilitacion diaria y ajustar carga si el dolor aumenta al dia siguiente.',
        'Usar el chat para registrar comidas y peso sin abrir formularios.',
      ],
    };
  }
}
