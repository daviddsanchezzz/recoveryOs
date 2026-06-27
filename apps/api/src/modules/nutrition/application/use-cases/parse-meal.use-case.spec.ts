import { ParseMealUseCase } from './parse-meal.use-case';
import { NutritionAiParserPort, ParsedMealResult } from '../../domain/nutrition-ai-parser.port';

const mockParser: NutritionAiParserPort = {
  parseMeal: jest.fn().mockResolvedValue({
    mealType: 'lunch',
    description: 'Pollo con arroz',
    rawText: 'pollo con arroz y ensalada',
    caloriesEstimate: 550,
    proteinEstimate: 40,
    carbsEstimate: 55,
    fatEstimate: 12,
    quality: 'high',
    confidence: 'medium',
    explanation: 'Plato completo con proteína magra y carbohidratos',
  } as ParsedMealResult),
};

describe('ParseMealUseCase', () => {
  let useCase: ParseMealUseCase;

  beforeEach(() => {
    useCase = new ParseMealUseCase(mockParser);
  });

  it('returns parsed result from AI parser', async () => {
    const result = await useCase.execute({ text: 'pollo con arroz y ensalada' });
    expect(result.mealType).toBe('lunch');
    expect(result.caloriesEstimate).toBe(550);
    expect(result.confidence).toBe('medium');
  });

  it('uses today as default date when not provided', async () => {
    await useCase.execute({ text: 'algo rico' });
    expect(mockParser.parseMeal).toHaveBeenCalledWith('algo rico', expect.any(Date));
  });
});
