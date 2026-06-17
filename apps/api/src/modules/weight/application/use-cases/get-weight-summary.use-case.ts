import { Inject, Injectable } from '@nestjs/common';
import { WEIGHT_REPOSITORY, WeightRepositoryPort } from '../../domain/weight-repository.port';

@Injectable()
export class GetWeightSummaryUseCase {
  constructor(
    @Inject(WEIGHT_REPOSITORY)
    private readonly repository: WeightRepositoryPort,
  ) {}

  async execute(userId: string) {
    const entries = (await this.repository.findByUser(userId)).sort(
      (left, right) => left.date.getTime() - right.date.getTime(),
    );
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const latest = entries.at(-1);
    const weeklyEntries = entries.filter((entry) => entry.date >= weekAgo);
    const monthlyEntries = entries.filter((entry) => entry.date >= monthAgo);
    const average =
      weeklyEntries.length > 0
        ? weeklyEntries.reduce((sum, entry) => sum + entry.weightKg, 0) / weeklyEntries.length
        : null;
    const monthlyChange =
      monthlyEntries.length > 1
        ? monthlyEntries.at(-1)!.weightKg - monthlyEntries[0]!.weightKg
        : 0;

    return {
      currentWeightKg: latest?.weightKg ?? null,
      trend: entries.map((entry) => ({ date: entry.date, value: entry.weightKg })),
      weeklyAverageKg: average ? Number(average.toFixed(2)) : null,
      monthlyChangeKg: Number(monthlyChange.toFixed(2)),
    };
  }
}
