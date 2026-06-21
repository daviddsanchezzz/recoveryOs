import { ActivityEntity } from '../../activity/domain/activity.entity';
import { StravaActivitySummary } from '../infrastructure/strava-api.client';

const TYPE_MAP: Record<string, string> = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike',
  MountainBikeRide: 'bike', GravelRide: 'bike', HandCycle: 'bike',
  Walk: 'walk', Hike: 'walk', NordicSki: 'walk',
  Swim: 'swim',
  WeightTraining: 'gym', Crossfit: 'gym', RockClimbing: 'gym',
  Yoga: 'mobility', Pilates: 'mobility', Stretching: 'mobility',
};

export function toActivityEntity(
  userId: string,
  act: StravaActivitySummary,
  calories: number | null,
  totalVolumeKg: number | null = null,
): ActivityEntity {
  const sportType = act.sport_type || act.type;
  const type = TYPE_MAP[sportType] ?? 'other';
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
    avgPaceSecPerKm: isRun && act.average_speed && act.average_speed > 0 ? 1000 / act.average_speed : null,
    avgCadenceSpm: isRun && act.average_cadence ? Math.round(act.average_cadence) : null,
    avgSpeedKmh: isBike && act.average_speed ? act.average_speed * 3.6 : null,
    avgPowerW: isBike && act.average_watts ? Math.round(act.average_watts) : null,
    avgCadenceRpm: isBike && act.average_cadence ? Math.round(act.average_cadence) : null,
    kilojoules: isBike && act.kilojoules ? act.kilojoules : null,
    distanceM: isSwim && act.distance ? Math.round(act.distance) : null,
    avgPace100mSec: isSwim && act.average_speed && act.average_speed > 0 ? 100 / act.average_speed : null,
    totalVolumeKg,
    stravaId: String(act.id),
    stravaName: act.name,
  });
}
