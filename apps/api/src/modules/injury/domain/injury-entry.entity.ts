export class InjuryEntryEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly date: Date,
    public readonly walkingPain: number,
    public readonly stiffness: number,
    public readonly swelling: boolean,
    public readonly rehabCompleted: boolean,
    public readonly notes?: string,
  ) {}
}

