import { Controller, Get, Inject, Query, Req, UnauthorizedException } from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { GetDayScoreUseCase } from '../application/use-cases/get-day-score.use-case';

@Controller('day-score')
export class DayScoreController {
  constructor(
    private readonly getDayScore: GetDayScoreUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Get()
  async get(@Req() req: any, @Query('date') date?: string) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return this.getDayScore.execute(session.user.id, date ? new Date(date) : undefined);
  }
}
