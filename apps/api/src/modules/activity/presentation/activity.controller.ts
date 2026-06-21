import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { LogActivityDto } from '../application/dto/log-activity.dto';
import { DeleteActivityUseCase } from '../application/use-cases/delete-activity.use-case';
import { GetActivitiesPaginatedUseCase } from '../application/use-cases/get-activities-paginated.use-case';
import { GetActivitySummaryUseCase } from '../application/use-cases/get-activity-summary.use-case';
import { GetTodayActivitiesUseCase } from '../application/use-cases/get-today-activities.use-case';
import { LogActivityUseCase } from '../application/use-cases/log-activity.use-case';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';

@Controller('activities')
export class ActivityController {
  constructor(
    private readonly logActivityUseCase: LogActivityUseCase,
    private readonly getActivitySummaryUseCase: GetActivitySummaryUseCase,
    private readonly getActivitiesPaginatedUseCase: GetActivitiesPaginatedUseCase,
    private readonly getTodayActivitiesUseCase: GetTodayActivitiesUseCase,
    private readonly deleteActivityUseCase: DeleteActivityUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  @Post()
  create(@Body() body: LogActivityDto) {
    return this.logActivityUseCase.execute(body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.deleteActivityUseCase.execute(id, session.user.id);
  }

  // Declare specific sub-routes before the bare :userId route
  @Get(':userId/summary')
  summary(@Param('userId') userId: string) {
    return this.getActivitySummaryUseCase.execute(userId);
  }

  @Get(':userId/today')
  async today(
    @Param('userId') userId: string,
    @Query('date') date: string,
    @Req() req: any,
  ) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    const d = date || new Date().toISOString().split('T')[0];
    return this.getTodayActivitiesUseCase.execute(userId, d);
  }

  @Get(':userId')
  async paginated(
    @Param('userId') userId: string,
    @Query('limit') limit: string,
    @Query('beforeId') beforeId: string,
    @Query('since') since: string,
    @Req() req: any,
  ) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();

    if (since) {
      const sinceDate = new Date(since);
      const items = await this.getActivitiesPaginatedUseCase.executeFrom(userId, sinceDate);
      return { items, hasMore: false, nextCursor: null };
    }

    return this.getActivitiesPaginatedUseCase.execute(
      userId,
      Number(limit) || 50,
      beforeId || undefined,
    );
  }
}
