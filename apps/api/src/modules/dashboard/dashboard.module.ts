import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { InjuryModule } from '../injury/injury.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { WeightModule } from '../weight/weight.module';
import { GetDashboardUseCase } from './application/use-cases/get-dashboard.use-case';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [WeightModule, InjuryModule, NutritionModule, ActivityModule],
  controllers: [DashboardController],
  providers: [GetDashboardUseCase],
  exports: [GetDashboardUseCase],
})
export class DashboardModule {}
