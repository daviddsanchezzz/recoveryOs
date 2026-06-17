import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LogWeightDto } from '../application/dto/log-weight.dto';
import { GetWeightSummaryUseCase } from '../application/use-cases/get-weight-summary.use-case';
import { LogWeightUseCase } from '../application/use-cases/log-weight.use-case';

@Controller('weights')
export class WeightController {
  constructor(
    private readonly logWeightUseCase: LogWeightUseCase,
    private readonly getWeightSummaryUseCase: GetWeightSummaryUseCase,
  ) {}

  @Post()
  create(@Body() body: LogWeightDto) {
    return this.logWeightUseCase.execute(body);
  }

  @Get(':userId/summary')
  summary(@Param('userId') userId: string) {
    return this.getWeightSummaryUseCase.execute(userId);
  }
}

