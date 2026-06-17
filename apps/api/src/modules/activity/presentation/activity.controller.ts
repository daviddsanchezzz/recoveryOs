import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LogActivityDto } from '../application/dto/log-activity.dto';
import { GetActivitySummaryUseCase } from '../application/use-cases/get-activity-summary.use-case';
import { LogActivityUseCase } from '../application/use-cases/log-activity.use-case';

@Controller('activities')
export class ActivityController {
  constructor(
    private readonly logActivityUseCase: LogActivityUseCase,
    private readonly getActivitySummaryUseCase: GetActivitySummaryUseCase,
  ) {}

  @Post()
  create(@Body() body: LogActivityDto) {
    return this.logActivityUseCase.execute(body);
  }

  @Get(':userId/summary')
  summary(@Param('userId') userId: string) {
    return this.getActivitySummaryUseCase.execute(userId);
  }
}

