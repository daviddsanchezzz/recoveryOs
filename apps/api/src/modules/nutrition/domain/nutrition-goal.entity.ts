export class NutritionGoalEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly caloriesTarget: number,
    public readonly proteinTarget: number,
    public readonly waterTargetMl: number | null,
    public readonly sex: 'male' | 'female' | null = null,
    public readonly heightCm: number | null = null,
    public readonly age: number | null = null,
  ) {}
}
