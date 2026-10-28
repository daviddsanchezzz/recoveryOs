import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PLAN_REPOSITORY, PlanRepositoryPort, StructuredGoalJson } from '../../domain/plan-repository.port';

export const STRUCTURED_GOAL_TYPES = [
  'steps_daily',
  'active_calories_daily',
  'sleep_hours_daily',
  'activity_minutes_weekly',
  'activity_sessions_weekly',
  'training_sessions_daily',
] as const;

const MAX_TARGET = 1_000_000;

/** Keeps only known goal types with a sane target; one entry per type. */
export function sanitizeStructuredGoals(input: unknown): StructuredGoalJson[] {
  if (!Array.isArray(input)) throw new BadRequestException('goals must be an array');

  const byType = new Map<string, StructuredGoalJson>();
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const { type, enabled, target } = item as Record<string, unknown>;
    if (typeof type !== 'string' || !(STRUCTURED_GOAL_TYPES as readonly string[]).includes(type)) continue;
    const numericTarget = Number(target);
    if (!Number.isFinite(numericTarget) || numericTarget < 0 || numericTarget > MAX_TARGET) continue;
    byType.set(type, { type, enabled: enabled === true, target: numericTarget });
  }
  return [...byType.values()];
}

@Injectable()
export class SaveStructuredGoalsUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly repo: PlanRepositoryPort) {}

  execute(userId: string, goals: unknown): Promise<StructuredGoalJson[]> {
    return this.repo.saveStructuredGoals(userId, sanitizeStructuredGoals(goals));
  }
}
