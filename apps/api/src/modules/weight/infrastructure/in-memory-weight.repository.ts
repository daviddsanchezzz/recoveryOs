import { Injectable } from '@nestjs/common';
import { WeightEntryEntity } from '../domain/weight-entry.entity';
import { WeightRepositoryPort } from '../domain/weight-repository.port';

@Injectable()
export class InMemoryWeightRepository implements WeightRepositoryPort {
  private readonly entries: WeightEntryEntity[] = [];

  async create(entry: WeightEntryEntity): Promise<WeightEntryEntity> {
    this.entries.push(entry);
    return entry;
  }

  async findByUser(userId: string): Promise<WeightEntryEntity[]> {
    return this.entries.filter((entry) => entry.userId === userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const idx = this.entries.findIndex((e) => e.id === id && e.userId === userId);
    if (idx === -1) return false;
    this.entries.splice(idx, 1);
    return true;
  }
}

