export class StravaTokenEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public accessToken: string,
    public refreshToken: string,
    public expiresAt: Date,
    public readonly stravaAthleteId: string,
    public lastSyncAt: Date | null,
  ) {}

  get isExpired(): boolean {
    return Date.now() >= this.expiresAt.getTime() - 60_000; // refresh 1 min early
  }
}
