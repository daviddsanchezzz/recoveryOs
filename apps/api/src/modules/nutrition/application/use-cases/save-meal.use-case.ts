import { Inject, Injectable } from '@nestjs/common';
import { NutritionEntryEntity } from '../../domain/nutrition-entry.entity';
import {
  NUTRITION_REPOSITORY,
  NutritionRepositoryPort,
} from '../../domain/nutrition-repository.port';
import { SaveMealDto } from '../dto/save-meal.dto';

@Injectable()
export class SaveMealUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY)
    private readonly repository: NutritionRepositoryPort,
  ) {}

  execute(input: SaveMealDto): Promise<NutritionEntryEntity> {
    const entry = new NutritionEntryEntity(
      crypto.randomUUID(),
      input.userId,
      new Date(`${input.date}T12:00:00.000Z`),
      input.rawText,
      input.caloriesEstimate,
      input.proteinEstimate,
      input.carbsEstimate ?? 0,
      input.fatEstimate ?? 0,
      input.mealType,
      input.description ?? null,
      input.quality ?? 'medium',
      input.confidence ?? 'medium',
      input.source ?? 'ai',
    );
    return this.repository.create(entry);
  }
}
