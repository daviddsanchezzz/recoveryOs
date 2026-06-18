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

    const recentEntries = entries.filter((entry) => entry.props.performedAt >= weekAgo);
    const totalMinutes = recentEntries.reduce(
      (sum, e) => sum + (e.props.durationMin ?? 0), 0,
    );

    const byType = recentEntries.reduce<Record<string, { count: number; totalMinutes: number }>>(
      (acc, entry) => {
        const current = acc[entry.props.type] ?? { count: 0, totalMinutes: 0 };
        acc[entry.props.type] = {
          count:        current.count + 1,
          totalMinutes: current.totalMinutes + (entry.props.durationMin ?? 0),
        };
        return acc;
      },
      {},
    );

    return {
      entries: recentEntries.map((e) => e.props),
      totalMinutes,
      byType: Object.entries(byType).map(([type, value]) => ({
        type,
        count:        value.count,
        totalMinutes: value.totalMinutes,
      })),
    };
  }
}

