import { Inject, Injectable } from '@nestjs/common';
import { UpdateGoalDto } from '../dto/update-goal.dto';
import { GoalEntity } from '../../domain/goal.entity';
import { PLAN_REPOSITORY, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class UpdateGoalUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(id: string, userId: string, data: UpdateGoalDto): Promise<GoalEntity | null> {
    return this.repo.updateGoal(id, userId, data);
  }
}
