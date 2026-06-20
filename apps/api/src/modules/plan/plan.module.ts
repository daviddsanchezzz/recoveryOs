import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreateGoalUseCase } from './application/use-cases/create-goal.use-case';
import { GetGoalsUseCase } from './application/use-cases/get-goals.use-case';
import { UpdateGoalUseCase } from './application/use-cases/update-goal.use-case';
import { DeleteGoalUseCase } from './application/use-cases/delete-goal.use-case';
import { CreateProgramUseCase } from './application/use-cases/create-program.use-case';
import { GetProgramUseCase } from './application/use-cases/get-program.use-case';
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
    PrismaPlanRepository,
    { provide: PLAN_REPOSITORY, useExisting: PrismaPlanRepository },
  ],
})
export class PlanModule {}
