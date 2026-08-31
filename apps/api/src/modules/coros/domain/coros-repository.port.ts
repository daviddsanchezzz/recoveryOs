import { CorosTokenEntity } from './coros-token.entity';

export const COROS_REPOSITORY = 'COROS_REPOSITORY';

export interface CorosOAuthClientInfo {
  clientId: string;
  clientSecret: string | null;
}

export interface CorosRepositoryPort {
  // Token CRUD (mirrors StravaRepositoryPort)
  findTokenByUser(userId: string): Promise<CorosTokenEntity | null>;
  saveToken(
    userId: string,
    data: { accessToken: string; refreshToken: string; expiresAt: Date; corosUserId?: string | null },
  ): Promise<void>;
  updateSyncStatus(
    userId: string,
    data: { syncStatus: string; syncError?: string | null; lastAttemptAt?: Date; lastSuccessfulSyncAt?: Date },
  ): Promise<void>;
  deleteToken(userId: string): Promise<void>;
  findAllConnectedUserIds(): Promise<string[]>;

  // App-level OAuth client (Dynamic Client Registration result, shared by all users)
  getOAuthClient(): Promise<CorosOAuthClientInfo | null>;
  saveOAuthClient(clientId: string, clientSecret: string | null): Promise<void>;

  // Per-attempt OAuth state (bridges the /connect and /callback requests)
  createOAuthState(state: string, userId: string): Promise<void>;
  saveCodeVerifierForState(state: string, codeVerifier: string): Promise<void>;
  consumeOAuthState(state: string): Promise<{ userId: string; codeVerifier: string | null } | null>;
  /** Deletes expired OAuthState rows (5-minute TTL). Returns the count deleted, for logging. */
  deleteExpiredOAuthStates(): Promise<number>;

  // App-level OAuth client invalidation (used by the SDK's self-healing retry on 401/DCR failure)
  deleteOAuthClient(): Promise<void>;
}
