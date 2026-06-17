import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ActivityModule } from './modules/activity/activity.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InjuryModule } from './modules/injury/injury.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { WeeklySummaryModule } from './modules/weekly-summary/weekly-summary.module';
import { WeightModule } from './modules/weight/weight.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

@Module({
  controllers: [AppController],
  imports: [
    PrismaModule,
    AuthModule,
    ActivityModule,
    WeightModule,
    InjuryModule,
    NutritionModule,
    DashboardModule,
    AiChatModule,
    WeeklySummaryModule,
  ],
})
export class AppModule {}
