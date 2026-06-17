import { Inject, Injectable } from '@nestjs/common';
import { INJURY_REPOSITORY, InjuryRepositoryPort } from '../../domain/injury-repository.port';

@Injectable()
export class GetInjurySummaryUseCase {
  constructor(
    @Inject(INJURY_REPOSITORY)
    private readonly repository: InjuryRepositoryPort,
  ) {}

  async execute(userId: string) {
    const entries = await this.repository.findByUser(userId);
    if (entries.length === 0) {
      return {
        weeklyAveragePain: null,
        weeklyAverageStiffness: null,
        rehabAdherence: null,
        latest: null,
      };
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyEntries = entries.filter((entry) => entry.date >= weekAgo);
    const relevantEntries = weeklyEntries.length > 0 ? weeklyEntries : entries;

    const pain =
      relevantEntries.reduce((sum, entry) => sum + entry.walkingPain, 0) / relevantEntries.length;
    const stiffness =
      relevantEntries.reduce((sum, entry) => sum + entry.stiffness, 0) / relevantEntries.length;
    const rehabAdherence =
      relevantEntries.filter((entry) => entry.rehabCompleted).length /
      Math.max(relevantEntries.length, 1);

    return {
      weeklyAveragePain: Number(pain.toFixed(2)),
      weeklyAverageStiffness: Number(stiffness.toFixed(2)),
      rehabAdherence: Number((rehabAdherence * 100).toFixed(0)),
      latest: entries[0] ?? null,
    };
  }
}
