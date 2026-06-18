import { Injectable } from '@nestjs/common';
import { Activity } from '@prisma/client';
import { ActivityEntity } from '../domain/activity.entity';
import { ActivityRepositoryPort } from '../domain/activity-repository.port';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

function toEntity(row: Activity): ActivityEntity {
  return new ActivityEntity({
    id:              row.id,
    userId:          row.userId,
    type:            row.type,
    source:          row.source,
    performedAt:     row.performedAt,
    durationMin:     row.durationMin,
    calories:        row.calories,
    avgHeartRate:    row.avgHeartRate,
    maxHeartRate:    row.maxHeartRate,
    notes:           row.notes,
    distanceKm:      row.distanceKm,
    elevationGainM:  row.elevationGainM,
    avgPaceSecPerKm: row.avgPaceSecPerKm,
    avgCadenceSpm:   row.avgCadenceSpm,
    avgSpeedKmh:     row.avgSpeedKmh,
    avgPowerW:       row.avgPowerW,
    avgCadenceRpm:   row.avgCadenceRpm,
    kilojoules:      row.kilojoules,
    distanceM:       row.distanceM,
    avgPace100mSec:  row.avgPace100mSec,
    muscleGroups:    row.muscleGroups,
    totalVolumeKg:   row.totalVolumeKg,
    stravaId:        row.stravaId,
    stravaName:      row.stravaName,
  });
}

@Injectable()
export class PrismaActivityRepository implements ActivityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: ActivityEntity): Promise<ActivityEntity> {
    const p = entry.props;

    // Ensure user exists (demo / unauthenticated fallback)
    await this.prisma.user.upsert({
      where:  { id: p.userId },
      update: {},
      create: { id: p.userId, email: `${p.userId}@demo.local`, name: 'Demo User' },
    });

    // Upsert by stravaId to handle Strava re-syncs
    const created = p.stravaId
      ? await this.prisma.activity.upsert({
          where:  { stravaId: p.stravaId },
          update: {
            type: p.type, durationMin: p.durationMin, calories: p.calories,
            avgHeartRate: p.avgHeartRate, maxHeartRate: p.maxHeartRate, notes: p.notes,
            distanceKm: p.distanceKm, elevationGainM: p.elevationGainM,
            avgPaceSecPerKm: p.avgPaceSecPerKm, avgCadenceSpm: p.avgCadenceSpm,
            avgSpeedKmh: p.avgSpeedKmh, avgPowerW: p.avgPowerW, avgCadenceRpm: p.avgCadenceRpm,
            kilojoules: p.kilojoules, distanceM: p.distanceM, avgPace100mSec: p.avgPace100mSec,
            muscleGroups: p.muscleGroups, totalVolumeKg: p.totalVolumeKg, stravaName: p.stravaName,
          },
          create: {
            id: p.id, userId: p.userId, type: p.type, source: p.source, performedAt: p.performedAt,
            durationMin: p.durationMin, calories: p.calories, avgHeartRate: p.avgHeartRate,
            maxHeartRate: p.maxHeartRate, notes: p.notes, distanceKm: p.distanceKm,
            elevationGainM: p.elevationGainM, avgPaceSecPerKm: p.avgPaceSecPerKm,
            avgCadenceSpm: p.avgCadenceSpm, avgSpeedKmh: p.avgSpeedKmh, avgPowerW: p.avgPowerW,
            avgCadenceRpm: p.avgCadenceRpm, kilojoules: p.kilojoules, distanceM: p.distanceM,
            avgPace100mSec: p.avgPace100mSec, muscleGroups: p.muscleGroups, totalVolumeKg: p.totalVolumeKg,
            stravaId: p.stravaId, stravaName: p.stravaName,
          },
        })
      : await this.prisma.activity.create({
          data: {
            id: p.id, userId: p.userId, type: p.type, source: p.source, performedAt: p.performedAt,
            durationMin: p.durationMin, calories: p.calories, avgHeartRate: p.avgHeartRate,
            maxHeartRate: p.maxHeartRate, notes: p.notes, distanceKm: p.distanceKm,
            elevationGainM: p.elevationGainM, avgPaceSecPerKm: p.avgPaceSecPerKm,
            avgCadenceSpm: p.avgCadenceSpm, avgSpeedKmh: p.avgSpeedKmh, avgPowerW: p.avgPowerW,
            avgCadenceRpm: p.avgCadenceRpm, kilojoules: p.kilojoules, distanceM: p.distanceM,
            avgPace100mSec: p.avgPace100mSec, muscleGroups: p.muscleGroups, totalVolumeKg: p.totalVolumeKg,
            stravaName: p.stravaName,
          },
        });

    return toEntity(created);
  }

  async findByUser(userId: string): Promise<ActivityEntity[]> {
    const rows = await this.prisma.activity.findMany({
      where:   { userId },
      orderBy: { performedAt: 'desc' },
    });
    return rows.map(toEntity);
  }

  async findByUserPaginated(
    userId: string,
    limit: number,
    beforeId?: string,
  ): Promise<{ items: ActivityEntity[]; hasMore: boolean }> {
    const rows = await this.prisma.activity.findMany({
      where:   { userId },
      orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
      take:    limit + 1,
      ...(beforeId ? { cursor: { id: beforeId }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    return { items: rows.slice(0, limit).map(toEntity), hasMore };
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.activity.delete({ where: { id } });
  }

  async findByUserToday(userId: string, date: string): Promise<ActivityEntity[]> {
    const start = new Date(date + 'T00:00:00.000Z');
    const end   = new Date(date + 'T23:59:59.999Z');
    const rows  = await this.prisma.activity.findMany({
      where:   { userId, performedAt: { gte: start, lte: end } },
      orderBy: { performedAt: 'desc' },
    });
    return rows.map(toEntity);
  }
}
