import { SleepEntryEntity } from './sleep-entry.entity';

export const SLEEP_REPOSITORY = 'SLEEP_REPOSITORY';

export interface SleepRepositoryPort {
  create(entry: SleepEntryEntity): Promise<SleepEntryEntity>;
  findByUser(userId: string): Promise<SleepEntryEntity[]>;
  update(id: string, data: Partial<{ date: Date; durationH: number; quality: number }>): Promise<SleepEntryEntity>;
  delete(id: string): Promise<void>;
}
