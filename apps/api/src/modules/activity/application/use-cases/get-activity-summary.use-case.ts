import { Inject, Injectable } from '@nestjs/common';
import { ACTIVITY_REPOSITORY, ActivityRepositoryPort } from '../../domain/activity-repository.port';

@Injectable()
export class GetActivitySummaryUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repository: ActivityRepositoryPort,
  ) {}

  async execute(userId: string) {
    const entries = await this.repository.findByUser(userId);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentEntries = entries.filter((entry) => entry.performedAt >= weekAgo);
    const totalMinutes = recentEntries.reduce((sum, entry) => sum + entry.durationMin, 0);

    const byType = recentEntries.reduce<Record<string, { count: number; totalMinutes: number }>>(
      (accumulator, entry) => {
        const current = accumulator[entry.type] ?? { count: 0, totalMinutes: 0 };
        accumulator[entry.type] = {
          count: current.count + 1,
          totalMinutes: current.totalMinutes + entry.durationMin,
        };
        return accumulator;
      },
      {},
    );

    return {
      entries: recentEntries,
      totalMinutes,
      byType: Object.entries(byType).map(([type, value]) => ({
        type,
        count: value.count,
        totalMinutes: value.totalMinutes,
      })),
    };
  }
}

