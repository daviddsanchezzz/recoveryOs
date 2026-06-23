import { NutritionGoalEntity } from './nutrition-goal.entity';

export const NUTRITION_GOAL_REPOSITORY = Symbol('NUTRITION_GOAL_REPOSITORY');

export interface NutritionGoalRepositoryPort {
  findByUser(userId: string): Promise<NutritionGoalEntity | null>;
  upsert(goal: NutritionGoalEntity): Promise<NutritionGoalEntity>;
}
