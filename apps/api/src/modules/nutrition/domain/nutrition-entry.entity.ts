export class NutritionEntryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly consumedAt: Date,
    public readonly rawText: string,
    public readonly calories: number,
    public readonly proteinGrams: number,
    public readonly carbsGrams: number,
    public readonly fatGrams: number,
  ) {}
}

