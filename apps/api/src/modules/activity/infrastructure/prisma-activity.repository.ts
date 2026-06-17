import { Injectable } from '@nestjs/common';
import { ActivityEntity } from '../domain/activity.entity';
import { ActivityRepositoryPort } from '../domain/activity-repository.port';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaActivityRepository implements ActivityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: ActivityEntity): Promise<ActivityEntity> {
    await this.prisma.user.upsert({
      where: { id: entry.userId },
      update: {},
      create: {
        id: entry.userId,
        email: `${entry.userId}@demo.local`,
        name: 'Demo User',
      },
    });

    const created = await this.prisma.activity.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        type: entry.type,
        durationMin: entry.durationMin,
        distanceKm: entry.distanceKm,
        calories: entry.calories,
        source: entry.source,
        performedAt: entry.performedAt,
      },
    });

    return new ActivityEntity(
      created.id,
      created.userId,
      created.type,
      created.durationMin,
      created.distanceKm,
      created.calories,
      created.source,
      created.performedAt,
    );
  }

  async findByUser(userId: string): Promise<ActivityEntity[]> {
    const entries = await this.prisma.activity.findMany({
      where: { userId },
      orderBy: { performedAt: 'desc' },
    });

    return entries.map(
      (entry) =>
        new ActivityEntity(
          entry.id,
          entry.userId,
          entry.type,
          entry.durationMin,
          entry.distanceKm,
          entry.calories,
          entry.source,
          entry.performedAt,
        ),
    );
  }
}

