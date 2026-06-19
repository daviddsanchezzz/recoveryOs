export class SleepEntryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly date: Date,
    public readonly durationH: number,
    public readonly quality: number, // 1-5
  ) {}
}
