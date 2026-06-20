import { GoalEntity } from './goal.entity';
import { ProgramEntity } from './program.entity';

export const PLAN_REPOSITORY = 'PLAN_REPOSITORY';

export interface PlanRepositoryPort {
  createGoal(goal: GoalEntity): Promise<GoalEntity>;
  findGoalsByUser(userId: string): Promise<GoalEntity[]>;
  updateGoal(
    id: string,
    userId: string,
    data: Partial<{ label: string; progressPct: number; isActive: boolean; sortOrder: number }>,
  ): Promise<GoalEntity | null>;
  deleteGoal(id: string, userId: string): Promise<boolean>;

  createProgram(program: ProgramEntity): Promise<ProgramEntity>;
  findActiveProgram(userId: string): Promise<ProgramEntity | null>;
  updateProgram(
    id: string,
    userId: string,
    data: Partial<{ name: string; currentWeek: number; isActive: boolean }>,
  ): Promise<ProgramEntity | null>;
  deleteProgram(id: string, userId: string): Promise<boolean>;
}
