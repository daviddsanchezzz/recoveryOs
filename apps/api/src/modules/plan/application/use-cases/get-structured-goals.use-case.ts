import { Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanRepositoryPort, StructuredGoalJson } from '../../domain/plan-repository.port';

@Injectable()
export class GetStructuredGoalsUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  /** `null` when the user has never saved goals (the client then keeps/uploads its own). */
  execute(userId: string): Promise<StructuredGoalJson[] | null> {
    return this.repo.findStructuredGoals(userId);
  }
}
