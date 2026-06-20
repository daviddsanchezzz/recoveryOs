import { Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanEntryJson, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class UpsertWeekPlanDayUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(
    userId: string,
    date: string,
    entries: PlanEntryJson[],
  ): Promise<{ date: string; entries: PlanEntryJson[] }> {
    return this.repo.upsertWeekPlanDay(userId, date, entries);
  }
}
