export class ActivityEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: string,
    public readonly durationMin: number,
    public readonly distanceKm: number | null,
    public readonly calories: number | null,
    public readonly source: string,
    public readonly performedAt: Date,
  ) {}
}

