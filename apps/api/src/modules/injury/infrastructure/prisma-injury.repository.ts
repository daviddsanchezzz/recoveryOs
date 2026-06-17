import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { InjuryEntryEntity } from '../domain/injury-entry.entity';
import { InjuryRepositoryPort } from '../domain/injury-repository.port';

@Injectable()
export class PrismaInjuryRepository implements InjuryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(entry: InjuryEntryEntity): Promise<InjuryEntryEntity> {
    await this.prisma.user.upsert({
      where: { id: entry.userId },
      update: {},
      create: {
        id: entry.userId,
        email: `${entry.userId}@demo.local`,
        name: 'Demo User',
      },
    });

    const created = await this.prisma.injuryEntry.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        date: entry.date,
        walkingPain: entry.walkingPain,
        stiffness: entry.stiffness,
        swelling: entry.swelling,
        rehabCompleted: entry.rehabCompleted,
        notes: entry.notes,
      },
    });

    return new InjuryEntryEntity(
      created.id,
      created.userId,
      created.date,
      created.walkingPain,
      created.stiffness,
      created.swelling,
      created.rehabCompleted,
      created.notes ?? undefined,
    );
  }

  async findByUser(userId: string): Promise<InjuryEntryEntity[]> {
    const entries = await this.prisma.injuryEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    return entries.map(
      (entry) =>
        new InjuryEntryEntity(
          entry.id,
          entry.userId,
          entry.date,
          entry.walkingPain,
          entry.stiffness,
          entry.swelling,
          entry.rehabCompleted,
          entry.notes ?? undefined,
        ),
    );
  }
}

