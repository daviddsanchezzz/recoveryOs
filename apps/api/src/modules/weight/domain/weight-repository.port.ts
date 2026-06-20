import { WeightEntryEntity } from './weight-entry.entity';

export const WEIGHT_REPOSITORY = Symbol('WEIGHT_REPOSITORY');

export interface WeightRepositoryPort {
  create(entry: WeightEntryEntity): Promise<WeightEntryEntity>;
  findByUser(userId: string): Promise<WeightEntryEntity[]>;
  delete(id: string, userId: string): Promise<boolean>;
}

