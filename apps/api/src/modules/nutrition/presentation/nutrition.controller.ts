import {
  BadRequestException,
  Body, Controller, Delete, ForbiddenException, Get, HttpCode,
  Inject, Param, Patch, Post, Query, Req, UnauthorizedException,
} from '@nestjs/common';
import { AUTH_SERVICE, AuthServicePort } from '../../auth/domain/auth-service.port';
import { DeleteMealUseCase } from '../application/use-cases/delete-meal.use-case';
import { GetDailySummaryUseCase } from '../application/use-cases/get-daily-summary.use-case';
import { GetMealsByDateUseCase } from '../application/use-cases/get-meals-by-date.use-case';
import { GetNutritionGoalUseCase } from '../application/use-cases/get-nutrition-goal.use-case';
import { GetNutritionSummaryUseCase } from '../application/use-cases/get-nutrition-summary.use-case';
import { GetTemplatesUseCase } from '../application/use-cases/get-templates.use-case';
import { GetWeeklyNutritionUseCase } from '../application/use-cases/get-weekly-nutrition.use-case';
import { LogMealUseCase } from '../application/use-cases/log-meal.use-case';
import { ParseMealUseCase } from '../application/use-cases/parse-meal.use-case';
import { SaveMealUseCase } from '../application/use-cases/save-meal.use-case';
import { UpdateMealUseCase } from '../application/use-cases/update-meal.use-case';
import { UpdateNutritionGoalUseCase } from '../application/use-cases/update-nutrition-goal.use-case';
import { LogMealDto } from '../application/dto/log-meal.dto';
import { ParseMealDto } from '../application/dto/parse-meal.dto';
import { SaveMealDto } from '../application/dto/save-meal.dto';
import { UpdateGoalDto } from '../application/dto/update-goal.dto';
import { UpdateMealDto } from '../application/dto/update-meal.dto';

@Controller('nutrition')
export class NutritionController {
  constructor(
    private readonly logMealUseCase: LogMealUseCase,
    private readonly getNutritionSummaryUseCase: GetNutritionSummaryUseCase,
    private readonly parseMealUseCase: ParseMealUseCase,
    private readonly saveMealUseCase: SaveMealUseCase,
    private readonly getMealsByDateUseCase: GetMealsByDateUseCase,
    private readonly updateMealUseCase: UpdateMealUseCase,
    private readonly deleteMealUseCase: DeleteMealUseCase,
    private readonly getDailySummaryUseCase: GetDailySummaryUseCase,
    private readonly getWeeklyNutritionUseCase: GetWeeklyNutritionUseCase,
    private readonly getNutritionGoalUseCase: GetNutritionGoalUseCase,
    private readonly updateNutritionGoalUseCase: UpdateNutritionGoalUseCase,
    private readonly getTemplatesUseCase: GetTemplatesUseCase,
    @Inject(AUTH_SERVICE) private readonly authService: AuthServicePort,
  ) {}

  private async requireSession(req: any) {
    const session = await this.authService.getSession({ headers: new Headers(req.headers) });
    if (!session) throw new UnauthorizedException();
    return session;
  }

  // ── Legacy endpoints (backward compat) ──────────────────────────────────

  @Post()
  create(@Body() body: LogMealDto) {
    return this.logMealUseCase.execute(body);
  }

  @Get(':userId/summary')
  legacySummary(@Param('userId') userId: string) {
    return this.getNutritionSummaryUseCase.execute(userId);
  }

  // ── Parse (AI proposal, no save) ────────────────────────────────────────

  @Post('parse')
  parse(@Body() body: ParseMealDto) {
    return this.parseMealUseCase.execute(body);
  }

  // ── Meals CRUD ───────────────────────────────────────────────────────────

  @Post('meals')
  async saveMeal(@Body() body: SaveMealDto, @Req() req: any) {
    const session = await this.requireSession(req);
    return this.saveMealUseCase.execute({ ...body, userId: session.user.id });
  }

  @Get('meals')
  async getMealsByDate(@Query('date') date: string, @Req() req: any) {
    if (!date) throw new BadRequestException('date is required');
    const session = await this.requireSession(req);
    return this.getMealsByDateUseCase.execute(session.user.id, date);
  }

  @Patch('meals/:id')
  async updateMeal(@Param('id') id: string, @Body() body: UpdateMealDto, @Req() req: any) {
    const session = await this.requireSession(req);
    return this.updateMealUseCase.execute(id, body, session.user.id);
  }

  @Delete('meals/:id')
  @HttpCode(204)
  async deleteMeal(@Param('id') id: string, @Req() req: any) {
    const session = await this.requireSession(req);
    await this.deleteMealUseCase.execute(id, session.user.id);
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  // NOTE: @Get('summary') MUST be declared before @Get(':userId/summary')
  // to avoid NestJS route shadowing (static segments take priority when ordered first).
  @Get('summary')
  async getDailySummary(@Query('date') date: string, @Req() req: any) {
    if (!date) throw new BadRequestException('date is required');
    const session = await this.requireSession(req);
    return this.getDailySummaryUseCase.execute(session.user.id, date);
  }

  @Get('weekly')
  async getWeekly(@Req() req: any) {
    const session = await this.requireSession(req);
    return this.getWeeklyNutritionUseCase.execute(session.user.id);
  }

  // ── Goals ────────────────────────────────────────────────────────────────

  @Get('goals')
  async getGoal(@Req() req: any) {
    const session = await this.requireSession(req);
    return this.getNutritionGoalUseCase.execute(session.user.id);
  }

  @Patch('goals')
  async updateGoal(@Body() body: UpdateGoalDto, @Req() req: any) {
    const session = await this.requireSession(req);
    return this.updateNutritionGoalUseCase.execute({ ...body, userId: session.user.id });
  }

  // ── Templates ────────────────────────────────────────────────────────────

  @Get('templates')
  getTemplates() {
    return this.getTemplatesUseCase.execute();
  }

  @Post('templates')
  getTemplatesPost() {
    return this.getTemplatesUseCase.execute();
  }
}
