import { Body, Controller, ForbiddenException, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { LogWeightDto } from '../application/dto/log-weight.dto';
import { GetWeightSummaryUseCase } from '../application/use-cases/get-weight-summary.use-case';
import { GetAllWeightsUseCase } from '../application/use-cases/get-all-weights.use-case';
import { LogWeightUseCase } from '../application/use-cases/log-weight.use-case';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';

@Controller('weights')
export class WeightController {
  constructor(
    private readonly logWeightUseCase: LogWeightUseCase,
    private readonly getWeightSummaryUseCase: GetWeightSummaryUseCase,
    private readonly getAllWeightsUseCase: GetAllWeightsUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Post()
  create(@Body() body: LogWeightDto) {
    return this.logWeightUseCase.execute(body);
  }

  @Get(':userId/summary')
  summary(@Param('userId') userId: string) {
    return this.getWeightSummaryUseCase.execute(userId);
  }

  @Get(':userId/all')
  async all(@Param('userId') userId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    return this.getAllWeightsUseCase.execute(userId);
  }
}

