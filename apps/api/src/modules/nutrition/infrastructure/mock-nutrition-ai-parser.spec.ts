import { MockNutritionAiParser } from './mock-nutrition-ai-parser';

describe('MockNutritionAiParser', () => {
  let parser: MockNutritionAiParser;

  beforeEach(() => {
    parser = new MockNutritionAiParser();
  });

  it('returns a ParsedMealResult with confidence low', async () => {
    const date = new Date('2026-06-23T13:00:00');
    const result = await parser.parseMeal('pollo con arroz', date);

    expect(result.rawText).toBe('pollo con arroz');
    expect(result.confidence).toBe('low');
    expect(result.mealType).toBe('lunch');
    expect(result.caloriesEstimate).toBeGreaterThan(0);
    expect(result.proteinEstimate).toBeGreaterThan(0);
  });

  it('infers breakfast when hour is before 10', async () => {
    const date = new Date('2026-06-23T08:30:00');
    const result = await parser.parseMeal('yogur con avena', date);
    expect(result.mealType).toBe('breakfast');
  });

  it('infers dinner when hour is 20', async () => {
    const date = new Date('2026-06-23T20:00:00');
    const result = await parser.parseMeal('cena ligera', date);
    expect(result.mealType).toBe('dinner');
  });
});
