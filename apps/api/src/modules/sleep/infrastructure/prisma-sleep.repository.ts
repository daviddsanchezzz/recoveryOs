import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SleepEntryEntity } from '../domain/sleep-entry.entity';
import { SleepRepositoryPort } from '../domain/sleep-repository.port';

function toEntity(r: { id: string; userId: string; date: Date; durationH: number; quality: number }): SleepEntryEntity {
  return new SleepEntryEntity(r.id, r.userId, r.date, r.durationH, r.quality);
}

@Injectable()
export class PrismaSleepRepository implements SleepRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@demo.local`, name: 'Demo User' },
    });
  }

  async create(entry: SleepEntryEntity): Promise<SleepEntryEntity> {
    await this.ensureUser(entry.userId);
    const r = await this.prisma.sleepEntry.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        date: entry.date,
        durationH: entry.durationH,
        quality: entry.quality,
      },
    });
    return toEntity(r);
  }

  async findByUser(userId: string): Promise<SleepEntryEntity[]> {
    const rows = await this.prisma.sleepEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return rows.map(toEntity);
  }

  async update(id: string, userId: string, data: Partial<{ date: Date; durationH: number; quality: number }>): Promise<SleepEntryEntity | null> {
    const { count } = await this.prisma.sleepEntry.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    const r = await this.prisma.sleepEntry.findUnique({ where: { id } });
    return r ? toEntity(r) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.sleepEntry.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}
