import { Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanEntryJson, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class UpsertTemplateDayUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(
    userId: string,
    dayIndex: number,
    entries: PlanEntryJson[],
  ): Promise<{ dayIndex: number; entries: PlanEntryJson[] }> {
    return this.repo.upsertTemplateDay(userId, dayIndex, entries);
  }
}
