import { ActivityEntity } from './activity.entity';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

export interface ActivityRepositoryPort {
  create(entry: ActivityEntity): Promise<ActivityEntity>;
  findByUser(userId: string): Promise<ActivityEntity[]>;
  findByUserPaginated(
    userId: string,
    limit: number,
    beforeId?: string,
  ): Promise<{ items: ActivityEntity[]; hasMore: boolean }>;
  findByUserToday(userId: string, date: string): Promise<ActivityEntity[]>;
  deleteById(id: string): Promise<void>;
}
