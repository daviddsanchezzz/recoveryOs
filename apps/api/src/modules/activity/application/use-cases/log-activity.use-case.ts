import { Inject, Injectable } from '@nestjs/common';
import { ActivityEntity } from '../../domain/activity.entity';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../domain/activity-repository.port';
import { LogActivityDto } from '../dto/log-activity.dto';

@Injectable()
export class LogActivityUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepositoryPort,
  ) {}

  execute(input: LogActivityDto) {
    const entry = new ActivityEntity(
      crypto.randomUUID(),
      input.userId,
      input.type,
      input.durationMin,
      input.distanceKm ?? null,
      input.calories ?? null,
      input.source,
      input.performedAt,
    );

    return this.repository.create(entry);
  }
}

