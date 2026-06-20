export class GoalEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly label: string,
    public readonly progressPct: number,
    public readonly isActive: boolean,
    public readonly sortOrder: number,
  ) {}
}
