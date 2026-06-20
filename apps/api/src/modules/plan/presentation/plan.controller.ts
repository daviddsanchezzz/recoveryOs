import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode,
  Inject, Param, Patch, Post, Put, Req,
} from '@nestjs/common';
import { CreateGoalDto } from '../application/dto/create-goal.dto';
import { UpdateGoalDto } from '../application/dto/update-goal.dto';
import { CreateProgramDto } from '../application/dto/create-program.dto';
import { CreateGoalUseCase } from '../application/use-cases/create-goal.use-case';
import { GetGoalsUseCase } from '../application/use-cases/get-goals.use-case';
import { UpdateGoalUseCase } from '../application/use-cases/update-goal.use-case';
import { DeleteGoalUseCase } from '../application/use-cases/delete-goal.use-case';
import { CreateProgramUseCase } from '../application/use-cases/create-program.use-case';
import { GetProgramUseCase } from '../application/use-cases/get-program.use-case';
import { GetWeekPlanUseCase } from '../application/use-cases/get-week-plan.use-case';
import { UpsertWeekPlanDayUseCase } from '../application/use-cases/upsert-week-plan-day.use-case';
import { GetTemplateUseCase } from '../application/use-cases/get-template.use-case';
import { UpsertTemplateDayUseCase } from '../application/use-cases/upsert-template-day.use-case';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { PlanEntryJson } from '../domain/plan-repository.port';

@Controller('plan')
export class PlanController {
  constructor(
    private readonly createGoalUseCase: CreateGoalUseCase,
    private readonly getGoalsUseCase: GetGoalsUseCase,
    private readonly updateGoalUseCase: UpdateGoalUseCase,
    private readonly deleteGoalUseCase: DeleteGoalUseCase,
    private readonly createProgramUseCase: CreateProgramUseCase,
    private readonly getProgramUseCase: GetProgramUseCase,
    private readonly getWeekPlanUseCase: GetWeekPlanUseCase,
    private readonly upsertWeekPlanDayUseCase: UpsertWeekPlanDayUseCase,
    private readonly getTemplateUseCase: GetTemplateUseCase,
    private readonly upsertTemplateDayUseCase: UpsertTemplateDayUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  // ── Goals ──────────────────────────────────────────────────────────────

  @Get(':userId/goals')
  async getGoals(@Param('userId') userId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    return this.getGoalsUseCase.execute(userId);
  }

  @Post('goals')
  async createGoal(@Body() body: CreateGoalDto, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.createGoalUseCase.execute({ ...body, userId: session.user.id });
  }

  @Patch('goals/:id')
  async updateGoal(@Param('id') id: string, @Body() body: UpdateGoalDto, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.updateGoalUseCase.execute(id, session.user.id, body);
  }

  @Delete('goals/:id')
  @HttpCode(204)
  async deleteGoal(@Param('id') id: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.deleteGoalUseCase.execute(id, session.user.id);
  }

  // ── Program ────────────────────────────────────────────────────────────

  @Get(':userId/program')
  async getProgram(@Param('userId') userId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    return this.getProgramUseCase.execute(userId);
  }

  @Post('program')
  async createProgram(@Body() body: CreateProgramDto, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.createProgramUseCase.execute({ ...body, userId: session.user.id });
  }

  // ── Week Plan ──────────────────────────────────────────────────────────

  @Get(':userId/week-plan')
  async getWeekPlan(@Param('userId') userId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    return this.getWeekPlanUseCase.execute(userId);
  }

  @Put('week-plan/:date')
  async upsertWeekPlanDay(
    @Param('date') date: string,
    @Body() body: { entries: PlanEntryJson[] },
    @Req() req: any,
  ) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.upsertWeekPlanDayUseCase.execute(session.user.id, date, body.entries ?? []);
  }

  // ── Template ───────────────────────────────────────────────────────────

  @Get(':userId/template')
  async getTemplate(@Param('userId') userId: string, @Req() req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session || session.user.id !== userId) throw new ForbiddenException();
    return this.getTemplateUseCase.execute(userId);
  }

  @Put('template/:dayIndex')
  async upsertTemplateDay(
    @Param('dayIndex') dayIndex: string,
    @Body() body: { entries: PlanEntryJson[] },
    @Req() req: any,
  ) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new ForbiddenException();
    return this.upsertTemplateDayUseCase.execute(session.user.id, parseInt(dayIndex, 10), body.entries ?? []);
  }
}
