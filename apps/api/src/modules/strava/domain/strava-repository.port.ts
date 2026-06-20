import { StravaTokenEntity } from './strava-token.entity';

export const STRAVA_REPOSITORY = 'STRAVA_REPOSITORY';

export interface StravaRepositoryPort {
  findTokenByUser(userId: string): Promise<StravaTokenEntity | null>;
  saveToken(token: StravaTokenEntity): Promise<void>;
  updateToken(userId: string, data: { accessToken: string; refreshToken: string; expiresAt: Date }): Promise<void>;
  updateLastSync(userId: string): Promise<void>;
  deleteToken(userId: string): Promise<void>;
}
