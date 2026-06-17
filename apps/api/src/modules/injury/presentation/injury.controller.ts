import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LogInjuryDto } from '../application/dto/log-injury.dto';
import { GetInjurySummaryUseCase } from '../application/use-cases/get-injury-summary.use-case';
import { LogInjuryUseCase } from '../application/use-cases/log-injury.use-case';

@Controller('injury')
export class InjuryController {
  constructor(
    private readonly logInjuryUseCase: LogInjuryUseCase,
    private readonly getInjurySummaryUseCase: GetInjurySummaryUseCase,
  ) {}

  @Post()
  create(@Body() body: LogInjuryDto) {
    return this.logInjuryUseCase.execute(body);
  }

  @Get(':userId/summary')
  summary(@Param('userId') userId: string) {
    return this.getInjurySummaryUseCase.execute(userId);
  }
}

