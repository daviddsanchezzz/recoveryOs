export class InjuryLogEntity {
  constructor(
    public readonly id: string,
    public readonly injuryId: string,
    public readonly userId: string,
    public readonly date: Date,
    public readonly painLevel: number,
    public readonly didRehab: boolean,
    public readonly notes?: string,
  ) {}
}
