import { Inject, Injectable } from '@nestjs/common';
import { GoalEntity } from '../../domain/goal.entity';
import { PLAN_REPOSITORY, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class GetGoalsUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(userId: string): Promise<GoalEntity[]> {
    return this.repo.findGoalsByUser(userId);
  }
}
