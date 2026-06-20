export class ProgramEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly totalWeeks: number,
    public readonly currentWeek: number,
    public readonly isActive: boolean,
    public readonly startDate: Date,
  ) {}
}
