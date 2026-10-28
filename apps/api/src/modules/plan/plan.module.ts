import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreateGoalUseCase } from './application/use-cases/create-goal.use-case';
import { GetGoalsUseCase } from './application/use-cases/get-goals.use-case';
import { UpdateGoalUseCase } from './application/use-cases/update-goal.use-case';
import { DeleteGoalUseCase } from './application/use-cases/delete-goal.use-case';
import { CreateProgramUseCase } from './application/use-cases/create-program.use-case';
import { GetProgramUseCase } from './application/use-cases/get-program.use-case';
import { GetWeekPlanUseCase } from './application/use-cases/get-week-plan.use-case';
import { UpsertWeekPlanDayUseCase } from './application/use-cases/upsert-week-plan-day.use-case';
import { GetTemplateUseCase } from './application/use-cases/get-template.use-case';
import { UpsertTemplateDayUseCase } from './application/use-cases/upsert-template-day.use-case';
import { GetStructuredGoalsUseCase } from './application/use-cases/get-structured-goals.use-case';
import { SaveStructuredGoalsUseCase } from './application/use-cases/save-structured-goals.use-case';
import { PLAN_REPOSITORY } from './domain/plan-repository.port';
import { PrismaPlanRepository } from './infrastructure/prisma-plan.repository';
import { PlanController } from './presentation/plan.controller';

@Module({
  imports: [AuthModule],
  controllers: [PlanController],
  providers: [
    CreateGoalUseCase,
    GetGoalsUseCase,
    UpdateGoalUseCase,
    DeleteGoalUseCase,
    CreateProgramUseCase,
    GetProgramUseCase,
    GetWeekPlanUseCase,
    UpsertWeekPlanDayUseCase,
    GetTemplateUseCase,
    UpsertTemplateDayUseCase,
    GetStructuredGoalsUseCase,
    SaveStructuredGoalsUseCase,
    PrismaPlanRepository,
    { provide: PLAN_REPOSITORY, useExisting: PrismaPlanRepository },
  ],
})
export class PlanModule {}
