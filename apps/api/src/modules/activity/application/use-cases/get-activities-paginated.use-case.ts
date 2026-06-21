import { Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../domain/activity-repository.port';

@Injectable()
export class GetActivitiesPaginatedUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepositoryPort,
  ) {}

  async execute(userId: string, limit: number, beforeId?: string) {
    const { items, hasMore } = await this.repository.findByUserPaginated(userId, limit, beforeId);
    const props = items.map((e) => e.props);
    const lastId = props[props.length - 1]?.id ?? null;
    return {
      items: props,
      hasMore,
      nextCursor: hasMore ? lastId : null,
    };
  }

  async executeFrom(userId: string, since: Date) {
    const items = await this.repository.findByUserFrom(userId, since);
    return items.map((e) => e.props);
  }
}
