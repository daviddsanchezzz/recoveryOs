export type InjuryStatus = 'active' | 'recovering' | 'resolved';

export class InjuryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly startDate: Date,
    public readonly status: InjuryStatus,
    public readonly bodyPart?: string,
    public readonly description?: string,
  ) {}
}
