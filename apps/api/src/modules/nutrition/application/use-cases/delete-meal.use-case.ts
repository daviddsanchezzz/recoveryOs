import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../domain/nutrition-repository.port';

@Injectable()
export class DeleteMealUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repository: NutritionRepositoryPort,
  ) {}

  async execute(id: string, callerId: string): Promise<void> {
    const meal = await this.repository.findById(id);
    if (!meal) throw new NotFoundException(`Meal ${id} not found`);
    if (meal.userId !== callerId) throw new ForbiddenException();
    return this.repository.delete(id);
  }
}
