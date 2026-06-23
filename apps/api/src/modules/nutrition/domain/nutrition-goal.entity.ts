export class NutritionGoalEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly caloriesTarget: number,
    public readonly proteinTarget: number,
    public readonly waterTargetMl: number | null,
  ) {}
}
