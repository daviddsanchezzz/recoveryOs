import { Inject, Injectable } from '@nestjs/common';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../../domain/strava-repository.port';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';

export type StravaStatus = {
  connected: boolean;
  lastSyncAt: string | null;
};

@Injectable()
export class GetStravaStatusUseCase {
  constructor(
    @Inject(STRAVA_REPOSITORY) private readonly repo: StravaRepositoryPort,
    @Inject(ACTIVITY_REPOSITORY) private readonly activityRepo: ActivityRepositoryPort,
  ) {}

  async execute(userId: string): Promise<StravaStatus> {
    const token = await this.repo.findTokenByUser(userId);
    if (!token) return { connected: false, lastSyncAt: null };

    // Webhooks bring activities in without touching token.lastSyncAt (that is
    // only the manual-sync cursor), so the latest data received is whichever
    // is newer: the last manual sync or the last Strava activity stored.
    const lastActivityAt = await this.activityRepo.findLatestCreatedAtBySource(userId, 'strava');
    const candidates = [token.lastSyncAt, lastActivityAt].filter((d): d is Date => d != null);
    const latest = candidates.length > 0 ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null;

    return { connected: true, lastSyncAt: latest?.toISOString() ?? null };
  }
}
