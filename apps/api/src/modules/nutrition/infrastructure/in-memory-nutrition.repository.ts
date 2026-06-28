import { Injectable } from '@nestjs/common';
import { NutritionEntryEntity } from '../domain/nutrition-entry.entity';
import { NutritionRepositoryPort } from '../domain/nutrition-repository.port';

@Injectable()
export class InMemoryNutritionRepository implements NutritionRepositoryPort {
  private readonly entries: NutritionEntryEntity[] = [];

  async create(entry: NutritionEntryEntity): Promise<NutritionEntryEntity> {
    this.entries.push(entry);
    return entry;
  }

  async findByUser(userId: string): Promise<NutritionEntryEntity[]> {
    return this.entries.filter((e) => e.userId === userId);
  }

  async findByDate(userId: string, date: string): Promise<NutritionEntryEntity[]> {
    const gte = new Date(`${date}T00:00:00.000Z`);
    const lte = new Date(`${date}T23:59:59.999Z`);
    return this.entries.filter(
      (e) => e.userId === userId && e.consumedAt >= gte && e.consumedAt <= lte,
    );
  }

  async findByDateRange(userId: string, from: Date, to: Date): Promise<NutritionEntryEntity[]> {
    return this.entries.filter(
      (e) => e.userId === userId && e.consumedAt >= from && e.consumedAt <= to,
    );
  }

  async findById(id: string): Promise<NutritionEntryEntity | null> {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  async update(
    id: string,
    fields: Partial<Pick<NutritionEntryEntity,
      'mealType' | 'description' | 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams' | 'quality'
    >>,
  ): Promise<NutritionEntryEntity> {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`Entry ${id} not found`);
    Object.assign(entry, fields);
    return entry;
  }

  async delete(id: string): Promise<void> {
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx !== -1) this.entries.splice(idx, 1);
  }
}
