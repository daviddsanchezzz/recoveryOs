import { Module } from '@nestjs/common';
import { GetNutritionSummaryUseCase } from './application/use-cases/get-nutrition-summary.use-case';
import { LogMealUseCase } from './application/use-cases/log-meal.use-case';
import { NUTRITION_REPOSITORY } from './domain/nutrition-repository.port';
import { PrismaNutritionRepository } from './infrastructure/prisma-nutrition.repository';
import { NutritionController } from './presentation/nutrition.controller';

@Module({
  controllers: [NutritionController],
  providers: [
    LogMealUseCase,
    GetNutritionSummaryUseCase,
    PrismaNutritionRepository,
    {
      provide: NUTRITION_REPOSITORY,
      useExisting: PrismaNutritionRepository,
    },
  ],
  exports: [NUTRITION_REPOSITORY, LogMealUseCase, GetNutritionSummaryUseCase],
})
export class NutritionModule {}
