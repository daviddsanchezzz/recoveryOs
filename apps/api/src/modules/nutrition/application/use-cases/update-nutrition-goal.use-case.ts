import { Inject, Injectable } from '@nestjs/common';
import { NutritionGoalEntity } from '../../domain/nutrition-goal.entity';
import {
  NUTRITION_GOAL_REPOSITORY,
  NutritionGoalRepositoryPort,
} from '../../domain/nutrition-goal-repository.port';
import { UpdateGoalDto } from '../dto/update-goal.dto';

@Injectable()
export class UpdateNutritionGoalUseCase {
  constructor(
    @Inject(NUTRITION_GOAL_REPOSITORY)
    private readonly repo: NutritionGoalRepositoryPort,
  ) {}

  async execute(input: UpdateGoalDto): Promise<NutritionGoalEntity> {
    const existing = await this.repo.findByUser(input.userId);
    const updated = new NutritionGoalEntity(
      existing?.id ?? crypto.randomUUID(),
      input.userId,
      input.caloriesTarget ?? existing?.caloriesTarget ?? 2300,
      input.proteinTarget ?? existing?.proteinTarget ?? 150,
      input.waterTargetMl ?? existing?.waterTargetMl ?? null,
    );
    return this.repo.upsert(updated);
  }
}
