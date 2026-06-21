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

function toActivityEntity(userId: string, act: StravaActivitySummary, calories: number | null, totalVolumeKg: number | null = null): ActivityEntity {
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
    calories,
    avgHeartRate: act.average_heartrate != null && act.average_heartrate > 0 ? Math.round(act.average_heartrate) : null,
    maxHeartRate: act.max_heartrate != null && act.max_heartrate > 0 ? Math.round(act.max_heartrate) : null,
    distanceKm: act.distance != null && act.distance > 0 ? act.distance / 1000 : null,
    elevationGainM: act.total_elevation_gain != null && act.total_elevation_gain > 0 ? act.total_elevation_gain : null,
    avgPaceSecPerKm: isRun && act.average_speed && act.average_speed > 0
      ? 1000 / act.average_speed
      : null,
    avgCadenceSpm: isRun && act.average_cadence ? Math.round(act.average_cadence) : null,
    avgSpeedKmh: isBike && act.average_speed ? act.average_speed * 3.6 : null,
    avgPowerW: isBike && act.average_watts ? Math.round(act.average_watts) : null,
    avgCadenceRpm: isBike && act.average_cadence ? Math.round(act.average_cadence) : null,
    kilojoules: isBike && act.kilojoules ? act.kilojoules : null,
    distanceM: isSwim && act.distance ? Math.round(act.distance) : null,
    avgPace100mSec: isSwim && act.average_speed && act.average_speed > 0
      ? 100 / act.average_speed
      : null,
    totalVolumeKg,
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

    console.log('[StravaSync] since=%s after=%s', since ?? 'none', after ?? 'none');

    let page = 1;
    let synced = 0;

    while (true) {
      const activities = await this.api.fetchActivities(token.accessToken, after, page);
      if (activities.length === 0) break;

      // Log raw list response (first page only to avoid noise)
      if (page === 1) {
        console.log('[StravaSync] RAW LIST (first activity):', JSON.stringify(activities[0], null, 2));
      }

      for (const act of activities) {
        let calories: number | null = null;
        let totalVolumeKg: number | null = null;
        try {
          const detail = await this.api.fetchActivityDetail(token.accessToken, act.id);

          // Log full raw detail for every WeightTraining/Workout (first one only per sync)
          if ((act.sport_type === 'WeightTraining' || act.sport_type === 'Workout') && synced === 0) {
            console.log('[StravaSync] RAW DETAIL WeightTraining "%s":', act.name, JSON.stringify(detail, null, 2));
          }

          calories = detail.calories != null && detail.calories > 0 ? Math.round(detail.calories) : null;
          if (detail.total_weight != null && (detail.total_weight as number) > 0) {
            totalVolumeKg = Math.round((detail.total_weight as number) * 10) / 10;
          }
        } catch { /* non-fatal */ }

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
