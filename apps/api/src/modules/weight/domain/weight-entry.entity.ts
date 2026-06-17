export class WeightEntryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly date: Date,
    public readonly weightKg: number,
  ) {}
}

