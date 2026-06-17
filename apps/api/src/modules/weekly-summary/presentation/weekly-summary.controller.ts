import { Controller, Get, Param } from '@nestjs/common';
import { GenerateWeeklySummaryUseCase } from '../application/use-cases/generate-weekly-summary.use-case';

@Controller('weekly-summary')
export class WeeklySummaryController {
  constructor(private readonly generateWeeklySummaryUseCase: GenerateWeeklySummaryUseCase) {}

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.generateWeeklySummaryUseCase.execute(userId);
  }
}

