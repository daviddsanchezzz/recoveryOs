import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ActivityModule } from './modules/activity/activity.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthMetricsModule } from './modules/health-metrics/health-metrics.module';
import { InjuryModule } from './modules/injury/injury.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { PlanModule } from './modules/plan/plan.module';
import { SleepModule } from './modules/sleep/sleep.module';
import { StravaModule } from './modules/strava/strava.module';
import { PushModule } from './modules/push/push.module';
import { WeeklySummaryModule } from './modules/weekly-summary/weekly-summary.module';
import { WeightModule } from './modules/weight/weight.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    AuthModule,
    ActivityModule,
    HealthMetricsModule,
    WeightModule,
    InjuryModule,
    SleepModule,
    NutritionModule,
    DashboardModule,
    AiChatModule,
    WeeklySummaryModule,
    PlanModule,
    StravaModule,
    PushModule,
  ],
})
export class AppModule {}
