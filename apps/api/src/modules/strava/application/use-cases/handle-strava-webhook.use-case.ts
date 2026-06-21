import { Inject, Injectable } from '@nestjs/common';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../../domain/strava-repository.port';
import { StravaApiClient } from '../../infrastructure/strava-api.client';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';
import { toActivityEntity } from '../strava-activity-mapper';

@Injectable()
export class HandleStravaWebhookUseCase {
  constructor(
    @Inject(STRAVA_REPOSITORY) private readonly stravaRepo: StravaRepositoryPort,
    @Inject(ACTIVITY_REPOSITORY) private readonly activityRepo: ActivityRepositoryPort,
    private readonly api: StravaApiClient,
  ) {}

  async execute(event: {
    objectType: string;
    aspectType: string;
    objectId: number;
    ownerId: number;
  }): Promise<void> {
    if (event.objectType !== 'activity') return;
    if (event.aspectType !== 'create') return;

    const token = await this.stravaRepo.findTokenByStravaAthleteId(String(event.ownerId));
    if (!token) {
      console.warn('[StravaWebhook] No token found for athlete %s', event.ownerId);
      return;
    }

    if (token.isExpired) {
      const refreshed = await this.api.refreshAccessToken(token.refreshToken);
      await this.stravaRepo.updateToken(token.userId, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: new Date(refreshed.expires_at * 1000),
      });
      token.accessToken = refreshed.access_token;
    }

    const detail = await this.api.fetchActivityDetail(token.accessToken, event.objectId);
    const calories = detail.calories != null && detail.calories > 0 ? Math.round(detail.calories) : null;
    const entity = toActivityEntity(token.userId, detail, calories);
    await this.activityRepo.create(entity);

    console.log('[StravaWebhook] Activity %s saved for user %s', event.objectId, token.userId);
  }
}
