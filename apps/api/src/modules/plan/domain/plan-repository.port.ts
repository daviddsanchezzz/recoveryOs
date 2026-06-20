import { GoalEntity } from './goal.entity';
import { ProgramEntity } from './program.entity';

export const PLAN_REPOSITORY = 'PLAN_REPOSITORY';

export type PlanEntryJson = {
  type: string;
  label: string;
  time?: string;
  muscleGroups?: string[];
};

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

  findWeekPlanDays(userId: string): Promise<Array<{ date: string; entries: PlanEntryJson[] }>>;
  upsertWeekPlanDay(userId: string, date: string, entries: PlanEntryJson[]): Promise<{ date: string; entries: PlanEntryJson[] }>;

  findTemplateDays(userId: string): Promise<Array<{ dayIndex: number; entries: PlanEntryJson[] }>>;
  upsertTemplateDay(userId: string, dayIndex: number, entries: PlanEntryJson[]): Promise<{ dayIndex: number; entries: PlanEntryJson[] }>;
}
