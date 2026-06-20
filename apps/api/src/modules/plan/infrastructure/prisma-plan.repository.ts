import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { GoalEntity } from '../domain/goal.entity';
import { ProgramEntity } from '../domain/program.entity';
import { PlanEntryJson, PlanRepositoryPort } from '../domain/plan-repository.port';

function toGoalEntity(r: {
  id: string;
  userId: string;
  label: string;
  progressPct: number;
  isActive: boolean;
  sortOrder: number;
}): GoalEntity {
  return new GoalEntity(r.id, r.userId, r.label, r.progressPct, r.isActive, r.sortOrder);
}

function toProgramEntity(r: {
  id: string;
  userId: string;
  name: string;
  totalWeeks: number;
  currentWeek: number;
  isActive: boolean;
  startDate: Date;
}): ProgramEntity {
  return new ProgramEntity(r.id, r.userId, r.name, r.totalWeeks, r.currentWeek, r.isActive, r.startDate);
}

@Injectable()
export class PrismaPlanRepository implements PlanRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@demo.local`, name: 'Demo User' },
    });
  }

  async createGoal(goal: GoalEntity): Promise<GoalEntity> {
    await this.ensureUser(goal.userId);
    const r = await this.prisma.goal.create({
      data: {
        id: goal.id,
        userId: goal.userId,
        label: goal.label,
        progressPct: goal.progressPct,
        isActive: goal.isActive,
        sortOrder: goal.sortOrder,
      },
    });
    return toGoalEntity(r);
  }

  async findGoalsByUser(userId: string): Promise<GoalEntity[]> {
    const rows = await this.prisma.goal.findMany({
      where: { userId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toGoalEntity);
  }

  async updateGoal(
    id: string,
    userId: string,
    data: Partial<{ label: string; progressPct: number; isActive: boolean; sortOrder: number }>,
  ): Promise<GoalEntity | null> {
    const { count } = await this.prisma.goal.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    const r = await this.prisma.goal.findUnique({ where: { id } });
    return r ? toGoalEntity(r) : null;
  }

  async deleteGoal(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.goal.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async createProgram(program: ProgramEntity): Promise<ProgramEntity> {
    await this.ensureUser(program.userId);
    await this.prisma.program.updateMany({
      where: { userId: program.userId, isActive: true },
      data: { isActive: false },
    });
    const r = await this.prisma.program.create({
      data: {
        id: program.id,
        userId: program.userId,
        name: program.name,
        totalWeeks: program.totalWeeks,
        currentWeek: program.currentWeek,
        isActive: program.isActive,
        startDate: program.startDate,
      },
    });
    return toProgramEntity(r);
  }

  async findActiveProgram(userId: string): Promise<ProgramEntity | null> {
    const r = await this.prisma.program.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return r ? toProgramEntity(r) : null;
  }

  async updateProgram(
    id: string,
    userId: string,
    data: Partial<{ name: string; currentWeek: number; isActive: boolean }>,
  ): Promise<ProgramEntity | null> {
    const { count } = await this.prisma.program.updateMany({ where: { id, userId }, data });
    if (count === 0) return null;
    const r = await this.prisma.program.findUnique({ where: { id } });
    return r ? toProgramEntity(r) : null;
  }

  async deleteProgram(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.program.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async findWeekPlanDays(userId: string): Promise<Array<{ date: string; entries: PlanEntryJson[] }>> {
    const rows = await this.prisma.weekPlanDay.findMany({ where: { userId }, orderBy: { date: 'asc' } });
    return rows.map((r) => ({ date: r.date, entries: r.entries as PlanEntryJson[] }));
  }

  async upsertWeekPlanDay(
    userId: string,
    date: string,
    entries: PlanEntryJson[],
  ): Promise<{ date: string; entries: PlanEntryJson[] }> {
    await this.ensureUser(userId);
    const r = await this.prisma.weekPlanDay.upsert({
      where: { userId_date: { userId, date } },
      update: { entries: entries as object[] },
      create: { userId, date, entries: entries as object[] },
    });
    return { date: r.date, entries: r.entries as PlanEntryJson[] };
  }

  async findTemplateDays(userId: string): Promise<Array<{ dayIndex: number; entries: PlanEntryJson[] }>> {
    const rows = await this.prisma.weekTemplateDay.findMany({ where: { userId }, orderBy: { dayIndex: 'asc' } });
    return rows.map((r) => ({ dayIndex: r.dayIndex, entries: r.entries as PlanEntryJson[] }));
  }

  async upsertTemplateDay(
    userId: string,
    dayIndex: number,
    entries: PlanEntryJson[],
  ): Promise<{ dayIndex: number; entries: PlanEntryJson[] }> {
    await this.ensureUser(userId);
    const r = await this.prisma.weekTemplateDay.upsert({
      where: { userId_dayIndex: { userId, dayIndex } },
      update: { entries: entries as object[] },
      create: { userId, dayIndex, entries: entries as object[] },
    });
    return { dayIndex: r.dayIndex, entries: r.entries as PlanEntryJson[] };
  }
}
