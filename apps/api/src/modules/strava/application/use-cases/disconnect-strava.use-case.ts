import { Inject, Injectable } from '@nestjs/common';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../../domain/strava-repository.port';

@Injectable()
export class DisconnectStravaUseCase {
  constructor(@Inject(STRAVA_REPOSITORY) private readonly repo: StravaRepositoryPort) {}

  execute(userId: string): Promise<void> {
    return this.repo.deleteToken(userId);
  }
}
