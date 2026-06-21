import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { StravaTokenEntity } from '../domain/strava-token.entity';
import { StravaRepositoryPort } from '../domain/strava-repository.port';

function toEntity(r: {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  stravaAthleteId: string;
  lastSyncAt: Date | null;
}): StravaTokenEntity {
  return new StravaTokenEntity(
    r.id, r.userId, r.accessToken, r.refreshToken,
    r.expiresAt, r.stravaAthleteId, r.lastSyncAt,
  );
}

@Injectable()
export class PrismaStravaRepository implements StravaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findTokenByUser(userId: string): Promise<StravaTokenEntity | null> {
    const r = await this.prisma.stravaToken.findUnique({ where: { userId } });
    return r ? toEntity(r) : null;
  }

  async findTokenByStravaAthleteId(stravaAthleteId: string): Promise<StravaTokenEntity | null> {
    const r = await this.prisma.stravaToken.findFirst({ where: { stravaAthleteId } });
    return r ? toEntity(r) : null;
  }

  async saveToken(token: StravaTokenEntity): Promise<void> {
    await this.prisma.stravaToken.upsert({
      where: { userId: token.userId },
      update: {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        stravaAthleteId: token.stravaAthleteId,
      },
      create: {
        id: token.id,
        userId: token.userId,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        stravaAthleteId: token.stravaAthleteId,
      },
    });
  }

  async updateToken(
    userId: string,
    data: { accessToken: string; refreshToken: string; expiresAt: Date },
  ): Promise<void> {
    await this.prisma.stravaToken.update({ where: { userId }, data });
  }

  async updateLastSync(userId: string): Promise<void> {
    await this.prisma.stravaToken.update({ where: { userId }, data: { lastSyncAt: new Date() } });
  }

  async deleteToken(userId: string): Promise<void> {
    await this.prisma.stravaToken.deleteMany({ where: { userId } });
  }

  async createOAuthState(state: string, userId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL
    await this.prisma.oAuthState.create({ data: { state, userId, expiresAt } });
  }

  async consumeOAuthState(state: string): Promise<string | null> {
    const record = await this.prisma.oAuthState.findUnique({ where: { state } });
    if (!record) return null;
    // Delete immediately (one-time use)
    await this.prisma.oAuthState.delete({ where: { state } });
    if (record.expiresAt < new Date()) return null;
    return record.userId;
  }
}
