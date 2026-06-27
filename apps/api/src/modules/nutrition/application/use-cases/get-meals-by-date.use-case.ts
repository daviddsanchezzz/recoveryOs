import { Inject, Injectable } from '@nestjs/common';
import { NutritionEntryEntity } from '../../domain/nutrition-entry.entity';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../domain/nutrition-repository.port';

@Injectable()
export class GetMealsByDateUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repository: NutritionRepositoryPort,
  ) {}

  execute(userId: string, date: string): Promise<NutritionEntryEntity[]> {
    return this.repository.findByDate(userId, date);
  }
}
