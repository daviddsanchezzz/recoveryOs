import { Inject, Injectable } from '@nestjs/common';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../../domain/strava-repository.port';

export type StravaStatus = {
  connected: boolean;
  lastSyncAt: string | null;
};

@Injectable()
export class GetStravaStatusUseCase {
  constructor(@Inject(STRAVA_REPOSITORY) private readonly repo: StravaRepositoryPort) {}

  async execute(userId: string): Promise<StravaStatus> {
    const token = await this.repo.findTokenByUser(userId);
    return {
      connected: !!token,
      lastSyncAt: token?.lastSyncAt?.toISOString() ?? null,
    };
  }
}
