import { Inject, Injectable } from '@nestjs/common';
import { ActivityEntity } from '../../domain/activity.entity';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../domain/activity-repository.port';
import { LogActivityDto } from '../dto/log-activity.dto';

@Injectable()
export class LogActivityUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepositoryPort,
  ) {}

  execute(input: LogActivityDto) {
    const entry = new ActivityEntity({
      id:             input.id ?? crypto.randomUUID(),
      userId:         input.userId,
      type:           input.type,
      source:         input.source,
      performedAt:    input.performedAt,
      durationMin:    input.durationMin     ?? null,
      calories:       input.calories        ?? null,
      avgHeartRate:   input.avgHeartRate    ?? null,
      maxHeartRate:   input.maxHeartRate    ?? null,
      notes:          input.notes           ?? null,
      distanceKm:     input.distanceKm      ?? null,
      elevationGainM: input.elevationGainM  ?? null,
      avgPaceSecPerKm:input.avgPaceSecPerKm ?? null,
      avgCadenceSpm:  input.avgCadenceSpm   ?? null,
      avgSpeedKmh:    input.avgSpeedKmh     ?? null,
      avgPowerW:      input.avgPowerW       ?? null,
      avgCadenceRpm:  input.avgCadenceRpm   ?? null,
      kilojoules:     input.kilojoules      ?? null,
      distanceM:      input.distanceM       ?? null,
      avgPace100mSec: input.avgPace100mSec  ?? null,
      muscleGroups:   input.muscleGroups    ?? [],
      totalVolumeKg:  input.totalVolumeKg   ?? null,
      stravaId:       input.stravaId        ?? null,
      stravaName:     input.stravaName      ?? null,
      isRace:         input.isRace          ?? false,
    });

    return this.repository.create(entry);
  }
}
