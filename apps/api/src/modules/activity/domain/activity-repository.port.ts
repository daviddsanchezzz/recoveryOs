import { ActivityEntity } from './activity.entity';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

export interface ActivityRepositoryPort {
  create(entry: ActivityEntity): Promise<ActivityEntity>;
  findByUser(userId: string): Promise<ActivityEntity[]>;
}

