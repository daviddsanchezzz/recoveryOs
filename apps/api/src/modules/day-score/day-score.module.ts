import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SleepModule } from '../sleep/sleep.module';
import { InjuryModule } from '../injury/injury.module';
import { ActivityModule } from '../activity/activity.module';
import { HealthMetricsModule } from '../health-metrics/health-metrics.module';
import { GetDayScoreUseCase } from './application/use-cases/get-day-score.use-case';
import { DayScoreController } from './presentation/day-score.controller';

@Module({
  imports: [AuthModule, SleepModule, InjuryModule, ActivityModule, HealthMetricsModule],
  controllers: [DayScoreController],
  providers: [GetDayScoreUseCase],
})
export class DayScoreModule {}
