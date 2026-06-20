import { Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanEntryJson, PlanRepositoryPort } from '../../domain/plan-repository.port';

@Injectable()
export class GetTemplateUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  async execute(userId: string): Promise<Record<string, PlanEntryJson[]>> {
    const days = await this.repo.findTemplateDays(userId);
    return Object.fromEntries(days.map((d) => [String(d.dayIndex), d.entries]));
  }
}
