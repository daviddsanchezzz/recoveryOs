import { Inject, Injectable } from '@nestjs/common';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { GoalEntity } from '../../domain/goal.entity';
import { PLAN_REPOSITORY, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class CreateGoalUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(input: CreateGoalDto): Promise<GoalEntity> {
    const goal = new GoalEntity(
      crypto.randomUUID(),
      input.userId,
      input.label,
      input.progressPct ?? 0,
      true,
      input.sortOrder ?? 0,
    );
    return this.repo.createGoal(goal);
  }
}
