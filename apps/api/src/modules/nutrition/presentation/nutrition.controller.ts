import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query,
} from '@nestjs/common';
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
  ) {}

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
  saveMeal(@Body() body: SaveMealDto) {
    return this.saveMealUseCase.execute(body);
  }

  @Get('meals')
  getMealsByDate(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.getMealsByDateUseCase.execute(userId, date);
  }

  @Patch('meals/:id')
  updateMeal(@Param('id') id: string, @Body() body: UpdateMealDto) {
    return this.updateMealUseCase.execute(id, body);
  }

  @Delete('meals/:id')
  @HttpCode(204)
  async deleteMeal(@Param('id') id: string) {
    await this.deleteMealUseCase.execute(id);
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  // NOTE: @Get('summary') MUST be declared before @Get(':userId/summary')
  // to avoid NestJS route shadowing (static segments take priority when ordered first).
  @Get('summary')
  getDailySummary(
    @Query('userId') userId: string,
    @Query('date') date: string,
  ) {
    return this.getDailySummaryUseCase.execute(userId, date);
  }

  @Get('weekly')
  getWeekly(@Query('userId') userId: string) {
    return this.getWeeklyNutritionUseCase.execute(userId);
  }

  // ── Goals ────────────────────────────────────────────────────────────────

  @Get('goals')
  getGoal(@Query('userId') userId: string) {
    return this.getNutritionGoalUseCase.execute(userId);
  }

  @Patch('goals')
  updateGoal(@Body() body: UpdateGoalDto) {
    return this.updateNutritionGoalUseCase.execute(body);
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
