import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../../domain/strava-repository.port';
import { StravaApiClient } from '../../infrastructure/strava-api.client';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';
import { toActivityEntity } from '../strava-activity-mapper';

@Injectable()
export class SyncStravaUseCase {
  constructor(
    @Inject(STRAVA_REPOSITORY) private readonly stravaRepo: StravaRepositoryPort,
    @Inject(ACTIVITY_REPOSITORY) private readonly activityRepo: ActivityRepositoryPort,
    private readonly api: StravaApiClient,
  ) {}

  async execute(userId: string, since?: string): Promise<{ synced: number }> {
    let token = await this.stravaRepo.findTokenByUser(userId);
    if (!token) throw new NotFoundException('Strava not connected');

    if (token.isExpired) {
      const refreshed = await this.api.refreshAccessToken(token.refreshToken);
      await this.stravaRepo.updateToken(userId, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: new Date(refreshed.expires_at * 1000),
      });
      token.accessToken = refreshed.access_token;
    }

    const after = since
      ? Math.floor(new Date(since).getTime() / 1000)
      : token.lastSyncAt
        ? Math.floor(token.lastSyncAt.getTime() / 1000)
        : undefined;

    let page = 1;
    let synced = 0;

    while (true) {
      const activities = await this.api.fetchActivities(token.accessToken, after, page);
      if (activities.length === 0) break;

      for (const act of activities) {
        const stravaId = String(act.id);
        const existing = await this.activityRepo.findByStravaId(stravaId);

        let calories: number | null = existing?.props.calories ?? null;
        let totalVolumeKg: number | null = existing?.props.totalVolumeKg ?? null;

        // Skip detail fetch if we already have calories saved
        if (calories == null) {
          try {
            const detail = await this.api.fetchActivityDetail(token.accessToken, act.id);
            calories = detail.calories != null && detail.calories > 0 ? Math.round(detail.calories) : null;
            if (detail.total_weight != null && (detail.total_weight as number) > 0) {
              totalVolumeKg = Math.round((detail.total_weight as number) * 10) / 10;
            }
          } catch (err) {
            console.warn('[StravaSync] detail fetch failed for %s: %s', act.id, (err as Error).message);
          }
        }

        const entity = toActivityEntity(userId, act, calories, totalVolumeKg);
        await this.activityRepo.create(entity);
        synced++;
      }

      if (activities.length < 200) break;
      page++;
    }

    await this.stravaRepo.updateLastSync(userId);
    return { synced };
  }
}
