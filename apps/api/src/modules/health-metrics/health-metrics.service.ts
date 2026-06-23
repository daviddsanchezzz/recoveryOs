import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { LogHealthMetricDto } from './application/dto/log-health-metric.dto';
import { UpdateHealthMetricDto } from './application/dto/update-health-metric.dto';

const STEPS_GOAL = 10000;
const ACTIVE_CALORIES_GOAL = 700;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class HealthMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(userId: string) {
    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@demo.local`, name: 'Demo User' },
    });
  }

  async createOrUpdateManual(userId: string, body: LogHealthMetricDto) {
    await this.ensureUser(userId);
    const source = body.source ?? 'manual';
    const date = startOfDay(body.date);

    return this.prisma.dailyHealthMetric.upsert({
      where: {
        userId_date_source: {
          userId,
          date,
          source,
        },
      },
      update: {
        steps: body.steps,
        activeCalories: body.activeCalories,
      },
      create: {
        id: body.id,
        userId,
        date,
        steps: body.steps,
        activeCalories: body.activeCalories,
        source,
      },
    });
  }

  async findByDate(userId: string, rawDate: Date, source?: string) {
    const date = startOfDay(rawDate);
    return this.prisma.dailyHealthMetric.findFirst({
      where: {
        userId,
        date: { gte: date, lte: endOfDay(rawDate) },
        ...(source ? { source } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findRange(userId: string, from?: Date, to?: Date, source?: string) {
    return this.prisma.dailyHealthMetric.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: startOfDay(from) } : {}),
                ...(to ? { lte: endOfDay(to) } : {}),
              },
            }
          : {}),
        ...(source ? { source } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  async update(id: string, userId: string, body: UpdateHealthMetricDto) {
    const existing = await this.prisma.dailyHealthMetric.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Health metric not found');

    const nextDate = body.date ? startOfDay(body.date) : existing.date;
    const nextSource = body.source ?? existing.source;

    return this.prisma.dailyHealthMetric.update({
      where: { id },
      data: {
        ...(body.date ? { date: nextDate } : {}),
        ...(body.steps !== undefined ? { steps: body.steps } : {}),
        ...(body.activeCalories !== undefined ? { activeCalories: body.activeCalories } : {}),
        ...(body.source ? { source: nextSource } : {}),
      },
    });
  }

  async delete(id: string, userId: string) {
    const { count } = await this.prisma.dailyHealthMetric.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async getSummary(userId: string, from: Date, to: Date, source?: string) {
    const rows = await this.findRange(userId, from, to, source);
    const daysWithData = rows.length;
    const totalSteps = rows.reduce((sum, row) => sum + row.steps, 0);
    const totalActiveCalories = rows.reduce((sum, row) => sum + row.activeCalories, 0);

    return {
      from: toIsoDate(startOfDay(from)),
      to: toIsoDate(startOfDay(to)),
      totalSteps,
      averageSteps: daysWithData > 0 ? Math.round(totalSteps / daysWithData) : 0,
      totalActiveCalories,
      averageActiveCalories: daysWithData > 0 ? Math.round(totalActiveCalories / daysWithData) : 0,
      daysWithData,
      stepsGoal: STEPS_GOAL,
      activeCaloriesGoal: ACTIVE_CALORIES_GOAL,
    };
  }
}
