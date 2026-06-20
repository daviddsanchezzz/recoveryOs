import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { InjuryEntity, InjuryStatus } from '../domain/injury.entity';
import { InjuryLogEntity } from '../domain/injury-log.entity';
import { InjuryRepositoryPort } from '../domain/injury-repository.port';

function toEntity(r: {
  id: string;
  userId: string;
  name: string;
  bodyPart: string | null;
  description: string | null;
  startDate: Date;
  status: string;
}): InjuryEntity {
  return new InjuryEntity(r.id, r.userId, r.name, r.startDate, r.status as InjuryStatus, r.bodyPart ?? undefined, r.description ?? undefined);
}

function toLogEntity(r: {
  id: string;
  injuryId: string;
  userId: string;
  date: Date;
  painLevel: number;
  didRehab: boolean;
  notes: string | null;
}): InjuryLogEntity {
  return new InjuryLogEntity(r.id, r.injuryId, r.userId, r.date, r.painLevel, r.didRehab, r.notes ?? undefined);
}

@Injectable()
export class PrismaInjuryRepository implements InjuryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@demo.local`, name: 'Demo User' },
    });
  }

  async createInjury(injury: InjuryEntity): Promise<InjuryEntity> {
    await this.ensureUser(injury.userId);
    const r = await this.prisma.injury.create({
      data: {
        id: injury.id,
        userId: injury.userId,
        name: injury.name,
        bodyPart: injury.bodyPart,
        description: injury.description,
        startDate: injury.startDate,
        status: injury.status,
      },
    });
    return toEntity(r);
  }

  async findInjuriesByUser(userId: string): Promise<(InjuryEntity & { logs: InjuryLogEntity[] })[]> {
    const rows = await this.prisma.injury.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      include: { logs: { orderBy: { date: 'desc' } } },
    });
    return rows.map((r) => Object.assign(toEntity(r), { logs: r.logs.map(toLogEntity) }));
  }

  async updateInjury(id: string, userId: string, data: Partial<{ name: string; bodyPart: string; description: string; startDate: Date; status: InjuryStatus }>): Promise<InjuryEntity | null> {
    const { count } = await this.prisma.injury.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    const r = await this.prisma.injury.findUnique({ where: { id } });
    return r ? toEntity(r) : null;
  }

  async deleteInjury(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.injury.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async createLog(log: InjuryLogEntity): Promise<InjuryLogEntity> {
    await this.ensureUser(log.userId);
    const r = await this.prisma.injuryLog.create({
      data: {
        id: log.id,
        injuryId: log.injuryId,
        userId: log.userId,
        date: log.date,
        painLevel: log.painLevel,
        didRehab: log.didRehab,
        notes: log.notes,
      },
    });
    return toLogEntity(r);
  }

  async findLogsByInjury(injuryId: string): Promise<InjuryLogEntity[]> {
    const rows = await this.prisma.injuryLog.findMany({
      where: { injuryId },
      orderBy: { date: 'desc' },
    });
    return rows.map(toLogEntity);
  }

  async findLogsByUser(userId: string): Promise<InjuryLogEntity[]> {
    const rows = await this.prisma.injuryLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return rows.map(toLogEntity);
  }

  async deleteLog(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.injuryLog.deleteMany({ where: { id, userId } });
    return count > 0;
  }
}
