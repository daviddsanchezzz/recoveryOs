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
    return this.entries.filter((entry) => entry.userId === userId);
  }
}

