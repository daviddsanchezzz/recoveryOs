import { NutritionEntryEntity } from './nutrition-entry.entity';

export const NUTRITION_REPOSITORY = Symbol('NUTRITION_REPOSITORY');

export interface NutritionRepositoryPort {
  create(entry: NutritionEntryEntity): Promise<NutritionEntryEntity>;
  findByUser(userId: string): Promise<NutritionEntryEntity[]>;
}

