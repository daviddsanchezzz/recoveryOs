import { SleepEntryEntity } from './sleep-entry.entity';

export const SLEEP_REPOSITORY = 'SLEEP_REPOSITORY';

export interface SleepRepositoryPort {
  create(entry: SleepEntryEntity): Promise<SleepEntryEntity>;
  findByUser(userId: string): Promise<SleepEntryEntity[]>;
  update(id: string, userId: string, data: Partial<{ date: Date; durationH: number; quality: number }>): Promise<SleepEntryEntity | null>;
  delete(id: string, userId: string): Promise<boolean>;
}
