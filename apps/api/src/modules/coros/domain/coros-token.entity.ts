export class CorosTokenEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public accessToken: string,
    public refreshToken: string,
    public expiresAt: Date,
    public corosUserId: string | null,
    public lastSyncAt: Date | null,
    public lastSuccessfulSyncAt: Date | null,
    public lastAttemptAt: Date | null,
    public syncStatus: string,
    public syncError: string | null,
  ) {}

  get isExpired(): boolean {
    return Date.now() >= this.expiresAt.getTime() - 60_000;
  }
}
