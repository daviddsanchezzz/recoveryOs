import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NutritionEntryEntity } from '../../domain/nutrition-entry.entity';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../domain/nutrition-repository.port';
import { UpdateMealDto } from '../dto/update-meal.dto';

@Injectable()
export class UpdateMealUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repository: NutritionRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateMealDto, callerId: string): Promise<NutritionEntryEntity> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Meal with id ${id} not found`);
    }
    if (existing.userId !== callerId) throw new ForbiddenException();

    return this.repository.update(id, {
      ...(input.mealType !== undefined && { mealType: input.mealType }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.caloriesEstimate !== undefined && { calories: input.caloriesEstimate }),
      ...(input.proteinEstimate !== undefined && { proteinGrams: input.proteinEstimate }),
      ...(input.carbsEstimate !== undefined && { carbsGrams: input.carbsEstimate }),
      ...(input.fatEstimate !== undefined && { fatGrams: input.fatEstimate }),
      ...(input.quality !== undefined && { quality: input.quality }),
    });
  }
}
