import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { GenerateWeeklySummaryUseCase } from './application/use-cases/generate-weekly-summary.use-case';
import { WeeklySummaryController } from './presentation/weekly-summary.controller';

@Module({
  imports: [DashboardModule],
  controllers: [WeeklySummaryController],
  providers: [GenerateWeeklySummaryUseCase],
})
export class WeeklySummaryModule {}

