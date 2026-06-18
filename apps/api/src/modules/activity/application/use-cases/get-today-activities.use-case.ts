import { Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../domain/activity-repository.port';

@Injectable()
export class GetTodayActivitiesUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepositoryPort,
  ) {}

  async execute(userId: string, date: string) {
    const items = await this.repository.findByUserToday(userId, date);
    return items.map((e) => e.props);
  }
}
