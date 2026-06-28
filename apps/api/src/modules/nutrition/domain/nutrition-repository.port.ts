import { NutritionEntryEntity } from './nutrition-entry.entity';

export const NUTRITION_REPOSITORY = Symbol('NUTRITION_REPOSITORY');

export interface NutritionRepositoryPort {
  create(entry: NutritionEntryEntity): Promise<NutritionEntryEntity>;
  findByUser(userId: string): Promise<NutritionEntryEntity[]>;
  findByDate(userId: string, date: string): Promise<NutritionEntryEntity[]>;
  findByDateRange(userId: string, from: Date, to: Date): Promise<NutritionEntryEntity[]>;
  findById(id: string): Promise<NutritionEntryEntity | null>;
  update(id: string, fields: Partial<Pick<NutritionEntryEntity,
    'mealType' | 'description' | 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams' | 'quality'
  >>): Promise<NutritionEntryEntity>;
  delete(id: string): Promise<void>;
}
