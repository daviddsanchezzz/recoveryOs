import { Inject, Injectable } from '@nestjs/common';
import { NutritionGoalEntity } from '../../domain/nutrition-goal.entity';
import {
  NUTRITION_GOAL_REPOSITORY,
  NutritionGoalRepositoryPort,
} from '../../domain/nutrition-goal-repository.port';

@Injectable()
export class GetNutritionGoalUseCase {
  constructor(
    @Inject(NUTRITION_GOAL_REPOSITORY)
    private readonly repo: NutritionGoalRepositoryPort,
  ) {}

  async execute(userId: string): Promise<NutritionGoalEntity> {
    const existing = await this.repo.findByUser(userId);
    if (existing) return existing;
    // Return default (not persisted) so the user sees defaults without a DB row
    return new NutritionGoalEntity(crypto.randomUUID(), userId, 2300, 150, null);
  }
}
