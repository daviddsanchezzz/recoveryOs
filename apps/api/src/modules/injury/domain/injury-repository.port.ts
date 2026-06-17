import { InjuryEntryEntity } from './injury-entry.entity';

export const INJURY_REPOSITORY = Symbol('INJURY_REPOSITORY');

export interface InjuryRepositoryPort {
  create(entry: InjuryEntryEntity): Promise<InjuryEntryEntity>;
  findByUser(userId: string): Promise<InjuryEntryEntity[]>;
}

