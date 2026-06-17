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
}

