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

  // userId is optional on the DTO (validated before the controller injects it from the
  // session) but always present by the time it reaches this use-case.
  async execute(input: UpdateGoalDto & { userId: string }): Promise<NutritionGoalEntity> {
    const existing = await this.repo.findByUser(input.userId);
    const updated = new NutritionGoalEntity(
      existing?.id ?? crypto.randomUUID(),
      input.userId,
      input.caloriesTarget ?? existing?.caloriesTarget ?? 2300,
      input.proteinTarget ?? existing?.proteinTarget ?? 150,
      input.waterTargetMl ?? existing?.waterTargetMl ?? null,
      input.sex ?? existing?.sex ?? null,
      input.heightCm ?? existing?.heightCm ?? null,
      input.age ?? existing?.age ?? null,
    );
    return this.repo.upsert(updated);
  }
}
