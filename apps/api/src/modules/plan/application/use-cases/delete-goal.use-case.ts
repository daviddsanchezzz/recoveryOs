import { Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class DeleteGoalUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(id: string, userId: string): Promise<boolean> {
    return this.repo.deleteGoal(id, userId);
  }
}
