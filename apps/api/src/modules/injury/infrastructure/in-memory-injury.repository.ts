import { Injectable } from '@nestjs/common';
import { InjuryEntryEntity } from '../domain/injury-entry.entity';
import { InjuryRepositoryPort } from '../domain/injury-repository.port';

@Injectable()
export class InMemoryInjuryRepository implements InjuryRepositoryPort {
  private readonly entries: InjuryEntryEntity[] = [];

  async create(entry: InjuryEntryEntity): Promise<InjuryEntryEntity> {
    this.entries.push(entry);
    return entry;
  }

  async findByUser(userId: string): Promise<InjuryEntryEntity[]> {
    return this.entries.filter((entry) => entry.userId === userId);
  }
}

