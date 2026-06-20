import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STRAVA_REPOSITORY, StravaRepositoryPort } from '../../domain/strava-repository.port';
import { StravaApiClient, StravaActivitySummary } from '../../infrastructure/strava-api.client';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../../activity/domain/activity-repository.port';
import { ActivityEntity } from '../../../activity/domain/activity.entity';

const TYPE_MAP: Record<string, string> = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike',
  MountainBikeRide: 'bike', GravelRide: 'bike', HandCycle: 'bike',
  Walk: 'walk', Hike: 'walk', NordicSki: 'walk',
  Swim: 'swim',
  WeightTraining: 'gym', Crossfit: 'gym', RockClimbing: 'gym',
  Yoga: 'mobility', Pilates: 'mobility', Stretching: 'mobility',
};

function mapType(stravaType: string): string {
  return TYPE_MAP[stravaType] ?? 'other';
}

function toActivityEntity(userId: string, act: StravaActivitySummary): ActivityEntity {
  const sportType = act.sport_type || act.type;
  const type = mapType(sportType);
  const isRun  = type === 'run';
  const isBike = type === 'bike';
  const isSwim = type === 'swim';

  return new ActivityEntity({
    id: crypto.randomUUID(),
    userId,
    type,
    source: 'strava',
    performedAt: new Date(act.start_date),
    durationMin: Math.round(act.elapsed_time / 60) || null,
    calories: act.calories ? Math.round(act.calories) : null,
    avgHeartRate: act.average_heartrate ? Math.round(act.average_heartrate) : null,
    maxHeartRate: act.max_heartrate ? Math.round(act.max_heartrate) : null,
    distanceKm: act.distance ? act.distance / 1000 : null,
    elevationGainM: act.total_elevation_gain || null,
    // Run/walk
    avgPaceSecPerKm: isRun && act.average_speed && act.average_speed > 0
      ? 1000 / act.average_speed
      : null,
    avgCadenceSpm: isRun && act.average_cadence ? Math.round(act.average_cadence) : null,
    // Bike
    avgSpeedKmh: isBike && act.average_speed ? act.average_speed * 3.6 : null,
    avgPowerW: isBike && act.average_watts ? Math.round(act.average_watts) : null,
    avgCadenceRpm: isBike && act.average_cadence ? Math.round(act.average_cadence) : null,
    kilojoules: isBike && act.kilojoules ? act.kilojoules : null,
    // Swim
    distanceM: isSwim && act.distance ? Math.round(act.distance) : null,
    avgPace100mSec: isSwim && act.average_speed && act.average_speed > 0
      ? 100 / act.average_speed
      : null,
    stravaId: String(act.id),
    stravaName: act.name,
  });
}

@Injectable()
export class SyncStravaUseCase {
  constructor(
    @Inject(STRAVA_REPOSITORY) private readonly stravaRepo: StravaRepositoryPort,
    @Inject(ACTIVITY_REPOSITORY) private readonly activityRepo: ActivityRepositoryPort,
    private readonly api: StravaApiClient,
  ) {}

  async execute(userId: string): Promise<{ synced: number }> {
    let token = await this.stravaRepo.findTokenByUser(userId);
    if (!token) throw new NotFoundException('Strava not connected');

    // Refresh token if expired
    if (token.isExpired) {
      const refreshed = await this.api.refreshAccessToken(token.refreshToken);
      await this.stravaRepo.updateToken(userId, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: new Date(refreshed.expires_at * 1000),
      });
      token.accessToken = refreshed.access_token;
    }

    // Fetch activities since last sync (or all if first sync)
    const after = token.lastSyncAt
      ? Math.floor(token.lastSyncAt.getTime() / 1000)
      : undefined;

    let page = 1;
    let synced = 0;

    while (true) {
      const activities = await this.api.fetchActivities(token.accessToken, after, page);
      if (activities.length === 0) break;

      for (const act of activities) {
        const entity = toActivityEntity(userId, act);
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
