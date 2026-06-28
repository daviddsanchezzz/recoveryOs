import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeleteMealUseCase } from './application/use-cases/delete-meal.use-case';
import { GetDailySummaryUseCase } from './application/use-cases/get-daily-summary.use-case';
import { GetMealsByDateUseCase } from './application/use-cases/get-meals-by-date.use-case';
import { GetNutritionGoalUseCase } from './application/use-cases/get-nutrition-goal.use-case';
import { GetNutritionSummaryUseCase } from './application/use-cases/get-nutrition-summary.use-case';
import { GetTemplatesUseCase } from './application/use-cases/get-templates.use-case';
import { GetWeeklyNutritionUseCase } from './application/use-cases/get-weekly-nutrition.use-case';
import { LogMealUseCase } from './application/use-cases/log-meal.use-case';
import { ParseMealUseCase } from './application/use-cases/parse-meal.use-case';
import { SaveMealUseCase } from './application/use-cases/save-meal.use-case';
import { UpdateMealUseCase } from './application/use-cases/update-meal.use-case';
import { UpdateNutritionGoalUseCase } from './application/use-cases/update-nutrition-goal.use-case';
import { NUTRITION_AI_PARSER } from './domain/nutrition-ai-parser.port';
import { NUTRITION_GOAL_REPOSITORY } from './domain/nutrition-goal-repository.port';
import { NUTRITION_REPOSITORY } from './domain/nutrition-repository.port';
import { MockNutritionAiParser } from './infrastructure/mock-nutrition-ai-parser';
import { OpenAiNutritionParser } from './infrastructure/openai-nutrition-parser';
import { PrismaNutritionGoalRepository } from './infrastructure/prisma-nutrition-goal.repository';
import { PrismaNutritionRepository } from './infrastructure/prisma-nutrition.repository';
import { NutritionController } from './presentation/nutrition.controller';

@Module({
  imports: [AuthModule],
  controllers: [NutritionController],
  providers: [
    // Use cases
    LogMealUseCase,
    GetNutritionSummaryUseCase,
    ParseMealUseCase,
    SaveMealUseCase,
    GetMealsByDateUseCase,
    UpdateMealUseCase,
    DeleteMealUseCase,
    GetDailySummaryUseCase,
    GetWeeklyNutritionUseCase,
    GetNutritionGoalUseCase,
    UpdateNutritionGoalUseCase,
    GetTemplatesUseCase,

    // Repositories
    PrismaNutritionRepository,
    { provide: NUTRITION_REPOSITORY, useExisting: PrismaNutritionRepository },

    PrismaNutritionGoalRepository,
    { provide: NUTRITION_GOAL_REPOSITORY, useExisting: PrismaNutritionGoalRepository },

    // AI Parser — OpenAI if key present, mock otherwise
    {
      provide: NUTRITION_AI_PARSER,
      useFactory: () =>
        process.env.OPENAI_API_KEY
          ? new OpenAiNutritionParser()
          : new MockNutritionAiParser(),
    },
  ],
  exports: [NUTRITION_REPOSITORY, LogMealUseCase, GetNutritionSummaryUseCase],
})
export class NutritionModule {}
