import { StravaTokenEntity } from './strava-token.entity';

export const STRAVA_REPOSITORY = 'STRAVA_REPOSITORY';

export interface StravaRepositoryPort {
  findTokenByUser(userId: string): Promise<StravaTokenEntity | null>;
  saveToken(token: StravaTokenEntity): Promise<void>;
  updateToken(userId: string, data: { accessToken: string; refreshToken: string; expiresAt: Date }): Promise<void>;
  updateLastSync(userId: string): Promise<void>;
  deleteToken(userId: string): Promise<void>;

  // OAuth state (CSRF protection via DB instead of cookies)
  createOAuthState(state: string, userId: string): Promise<void>;
  consumeOAuthState(state: string): Promise<string | null>; // returns userId or null if invalid/expired
}
