import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../auth/domain/auth-service.port';
import { LogHealthMetricDto } from './application/dto/log-health-metric.dto';
import { UpdateHealthMetricDto } from './application/dto/update-health-metric.dto';
import { HealthMetricsService } from './health-metrics.service';

@Controller('health-metrics')
export class HealthMetricsController {
  constructor(
    private readonly healthMetricsService: HealthMetricsService,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  private async getUserId(req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return session.user.id;
  }

  @Get()
  async get(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('source') source?: string,
  ) {
    const userId = await this.getUserId(req);
    if (date) {
      return this.healthMetricsService.findByDate(userId, new Date(date), source);
    }
    return this.healthMetricsService.findRange(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      source,
    );
  }

  @Get('summary')
  async summary(
    @Req() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('source') source?: string,
  ) {
    const userId = await this.getUserId(req);
    return this.healthMetricsService.getSummary(userId, new Date(from), new Date(to), source);
  }

  @Post()
  async create(@Req() req: any, @Body() body: LogHealthMetricDto) {
    const userId = await this.getUserId(req);
    return this.healthMetricsService.createOrUpdateManual(userId, body);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateHealthMetricDto) {
    const userId = await this.getUserId(req);
    return this.healthMetricsService.update(id, userId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = await this.getUserId(req);
    await this.healthMetricsService.delete(id, userId);
  }
}
