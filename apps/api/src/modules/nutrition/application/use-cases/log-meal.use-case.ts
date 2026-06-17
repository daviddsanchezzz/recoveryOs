import { Inject, Injectable } from '@nestjs/common';
import { NutritionEntryEntity } from '../../domain/nutrition-entry.entity';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../domain/nutrition-repository.port';
import { LogMealDto } from '../dto/log-meal.dto';

@Injectable()
export class LogMealUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repository: NutritionRepositoryPort,
  ) {}

  execute(input: LogMealDto) {
    const entry = new NutritionEntryEntity(
      crypto.randomUUID(),
      input.userId,
      input.consumedAt,
      input.rawText,
      input.calories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
    );
    return this.repository.create(entry);
  }
}

