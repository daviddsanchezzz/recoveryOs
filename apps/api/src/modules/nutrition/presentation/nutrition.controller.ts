import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LogMealDto } from '../application/dto/log-meal.dto';
import { GetNutritionSummaryUseCase } from '../application/use-cases/get-nutrition-summary.use-case';
import { LogMealUseCase } from '../application/use-cases/log-meal.use-case';

@Controller('nutrition')
export class NutritionController {
  constructor(
    private readonly logMealUseCase: LogMealUseCase,
    private readonly getNutritionSummaryUseCase: GetNutritionSummaryUseCase,
  ) {}

  @Post()
  create(@Body() body: LogMealDto) {
    return this.logMealUseCase.execute(body);
  }

  @Get(':userId/summary')
  summary(@Param('userId') userId: string) {
    return this.getNutritionSummaryUseCase.execute(userId);
  }
}

