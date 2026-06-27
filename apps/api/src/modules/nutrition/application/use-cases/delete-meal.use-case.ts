import { Inject, Injectable } from '@nestjs/common';
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

  execute(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}
