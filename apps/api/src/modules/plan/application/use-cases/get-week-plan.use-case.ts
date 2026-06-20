import { Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanEntryJson, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class GetWeekPlanUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  async execute(userId: string): Promise<Record<string, PlanEntryJson[]>> {
    const days = await this.repo.findWeekPlanDays(userId);
    return Object.fromEntries(days.map((d) => [d.date, d.entries]));
  }
}
