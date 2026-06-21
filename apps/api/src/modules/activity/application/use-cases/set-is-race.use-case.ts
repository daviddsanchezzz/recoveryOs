import { Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../domain/activity-repository.port';

@Injectable()
export class SetIsRaceUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepositoryPort,
  ) {}

  execute(id: string, userId: string, isRace: boolean): Promise<boolean> {
    return this.repository.setIsRace(id, userId, isRace);
  }
}
