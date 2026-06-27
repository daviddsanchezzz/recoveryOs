import { GetDailySummaryUseCase } from './get-daily-summary.use-case';
import { NutritionEntryEntity } from '../../domain/nutrition-entry.entity';
import { NutritionGoalEntity } from '../../domain/nutrition-goal.entity';
import { NutritionRepositoryPort } from '../../domain/nutrition-repository.port';
import { NutritionGoalRepositoryPort } from '../../domain/nutrition-goal-repository.port';

function makeEntry(mealType: string, calories: number, protein: number): NutritionEntryEntity {
  return new NutritionEntryEntity(
    crypto.randomUUID(), 'user-1', new Date(), 'rawText',
    calories, protein, 50, 10, mealType as any,
  );
}

const defaultGoal = new NutritionGoalEntity('g1', 'user-1', 2300, 150, null);

const mockRepo: NutritionRepositoryPort = {
  create: jest.fn(),
  findByUser: jest.fn(),
  findByDate: jest.fn().mockResolvedValue([
    makeEntry('breakfast', 400, 20),
    makeEntry('lunch', 700, 45),
    makeEntry('snack', 150, 5),
  ]),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockGoalRepo: NutritionGoalRepositoryPort = {
  findByUser: jest.fn().mockResolvedValue(defaultGoal),
  upsert: jest.fn(),
};

describe('GetDailySummaryUseCase', () => {
  let useCase: GetDailySummaryUseCase;

  beforeEach(() => {
    useCase = new GetDailySummaryUseCase(mockRepo, mockGoalRepo);
  });

  it('aggregates totals correctly', async () => {
    const result = await useCase.execute('user-1', '2026-06-23');
    expect(result.totalCalories).toBe(1250);
    expect(result.totalProtein).toBe(70);
    expect(result.mealsCount).toBe(3);
  });

  it('returns missing required meal types', async () => {
    const result = await useCase.execute('user-1', '2026-06-23');
    expect(result.missingMealTypes).toContain('dinner');
    expect(result.missingMealTypes).not.toContain('breakfast');
    expect(result.missingMealTypes).not.toContain('lunch');
  });

  it('calculates progress percentages', async () => {
    const result = await useCase.execute('user-1', '2026-06-23');
    expect(result.caloriesProgressPercent).toBe(Math.round(1250 / 2300 * 100));
    expect(result.proteinProgressPercent).toBe(Math.round(70 / 150 * 100));
  });

  it('uses default goal when user has no goal set', async () => {
    (mockGoalRepo.findByUser as jest.Mock).mockResolvedValueOnce(null);
    const result = await useCase.execute('user-1', '2026-06-23');
    expect(result.caloriesTarget).toBe(2300);
    expect(result.proteinTarget).toBe(150);
  });
});
