import { NutritionEntryEntity } from './nutrition-entry.entity';

describe('NutritionEntryEntity', () => {
  it('sets default values for optional fields', () => {
    const entry = new NutritionEntryEntity(
      'id-1', 'user-1', new Date(), 'pizza', 800, 30, 90, 25,
    );
    expect(entry.mealType).toBe('snack');
    expect(entry.quality).toBe('medium');
    expect(entry.confidence).toBe('medium');
    expect(entry.source).toBe('manual');
    expect(entry.description).toBeNull();
  });

  it('accepts explicit values for new fields', () => {
    const entry = new NutritionEntryEntity(
      'id-2', 'user-1', new Date(), 'ensalada', 300, 20, 30, 10,
      'lunch', 'Ensalada mixta', 'high', 'high', 'ai',
    );
    expect(entry.mealType).toBe('lunch');
    expect(entry.description).toBe('Ensalada mixta');
    expect(entry.quality).toBe('high');
    expect(entry.source).toBe('ai');
  });
});
