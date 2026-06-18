export interface ActivityProps {
  id: string;
  userId: string;
  type: string;
  source: string;
  performedAt: Date;

  // Common
  durationMin?: number | null;
  calories?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  notes?: string | null;

  // Distance
  distanceKm?: number | null;
  elevationGainM?: number | null;

  // Run / Walk
  avgPaceSecPerKm?: number | null;
  avgCadenceSpm?: number | null;

  // Bike
  avgSpeedKmh?: number | null;
  avgPowerW?: number | null;
  avgCadenceRpm?: number | null;
  kilojoules?: number | null;

  // Swim
  distanceM?: number | null;
  avgPace100mSec?: number | null;

  // Gym
  muscleGroups?: string[];
  totalVolumeKg?: number | null;

  // Strava
  stravaId?: string | null;
  stravaName?: string | null;
}

export class ActivityEntity {
  constructor(public readonly props: ActivityProps) {}
}
