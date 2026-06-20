import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { WeightEntryEntity } from '../domain/weight-entry.entity';
import { WeightRepositoryPort } from '../domain/weight-repository.port';

@Injectable()
export class PrismaWeightRepository implements WeightRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: WeightEntryEntity): Promise<WeightEntryEntity> {
    await this.prisma.user.upsert({
      where: { id: entry.userId },
      update: {},
      create: {
        id: entry.userId,
        email: `${entry.userId}@demo.local`,
        name: 'Demo User',
      },
    });

    const created = await this.prisma.weightEntry.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        date: entry.date,
        weightKg: entry.weightKg,
      },
    });

    return new WeightEntryEntity(created.id, created.userId, created.date, created.weightKg);
  }

  async findByUser(userId: string): Promise<WeightEntryEntity[]> {
    const entries = await this.prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    return entries.map((entry) => new WeightEntryEntity(entry.id, entry.userId, entry.date, entry.weightKg));
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.weightEntry.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}

