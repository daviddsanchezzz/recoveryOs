export class SleepEntryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly date: Date,
    public readonly durationH: number,
    public readonly quality: number, // 1-5, manual entry only
    public readonly score: number | null = null, // 0-100, from COROS
    public readonly source: string = 'manual', // manual | coros
  ) {}
}
