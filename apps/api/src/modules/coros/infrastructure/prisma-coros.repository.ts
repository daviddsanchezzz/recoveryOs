import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { CorosTokenEntity } from '../domain/coros-token.entity';
import { CorosOAuthClientInfo, CorosRepositoryPort } from '../domain/coros-repository.port';

const OAUTH_CLIENT_ID = 'singleton';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

function toEntity(r: {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  corosUserId: string | null;
  lastSyncAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  lastAttemptAt: Date | null;
  syncStatus: string;
  syncError: string | null;
}): CorosTokenEntity {
  return new CorosTokenEntity(
    r.id, r.userId, r.accessToken, r.refreshToken, r.expiresAt, r.corosUserId,
    r.lastSyncAt, r.lastSuccessfulSyncAt, r.lastAttemptAt, r.syncStatus, r.syncError,
  );
}

@Injectable()
export class PrismaCorosRepository implements CorosRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findTokenByUser(userId: string): Promise<CorosTokenEntity | null> {
    const r = await this.prisma.corosToken.findUnique({ where: { userId } });
    return r ? toEntity(r) : null;
  }

  async saveToken(
    userId: string,
    data: { accessToken: string; refreshToken: string; expiresAt: Date; corosUserId?: string | null },
  ): Promise<void> {
    await this.prisma.corosToken.upsert({
      where: { userId },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        ...(data.corosUserId !== undefined ? { corosUserId: data.corosUserId } : {}),
      },
      create: {
        userId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        corosUserId: data.corosUserId ?? null,
      },
    });
  }

  async updateSyncStatus(
    userId: string,
    data: { syncStatus: string; syncError?: string | null; lastAttemptAt?: Date; lastSuccessfulSyncAt?: Date },
  ): Promise<void> {
    await this.prisma.corosToken.update({
      where: { userId },
      data: {
        syncStatus: data.syncStatus,
        syncError: data.syncError ?? null,
        lastSyncAt: new Date(),
        ...(data.lastAttemptAt ? { lastAttemptAt: data.lastAttemptAt } : {}),
        ...(data.lastSuccessfulSyncAt ? { lastSuccessfulSyncAt: data.lastSuccessfulSyncAt } : {}),
      },
    });
  }

  async deleteToken(userId: string): Promise<void> {
    await this.prisma.corosToken.deleteMany({ where: { userId } });
  }

  async findAllConnectedUserIds(): Promise<string[]> {
    const rows = await this.prisma.corosToken.findMany({ select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  async getOAuthClient(): Promise<CorosOAuthClientInfo | null> {
    const r = await this.prisma.corosOAuthClient.findUnique({ where: { id: OAUTH_CLIENT_ID } });
    return r ? { clientId: r.clientId, clientSecret: r.clientSecret } : null;
  }

  async saveOAuthClient(clientId: string, clientSecret: string | null): Promise<void> {
    await this.prisma.corosOAuthClient.upsert({
      where: { id: OAUTH_CLIENT_ID },
      update: { clientId, clientSecret },
      create: { id: OAUTH_CLIENT_ID, clientId, clientSecret },
    });
  }

  async createOAuthState(state: string, userId: string): Promise<void> {
    await this.prisma.corosOAuthState.create({
      data: { state, userId, expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS) },
    });
  }

  async saveCodeVerifierForState(state: string, codeVerifier: string): Promise<void> {
    await this.prisma.corosOAuthState.update({ where: { state }, data: { codeVerifier } });
  }

  async consumeOAuthState(state: string): Promise<{ userId: string; codeVerifier: string | null } | null> {
    const record = await this.prisma.corosOAuthState.findUnique({ where: { state } });
    if (!record) return null;
    await this.prisma.corosOAuthState.delete({ where: { state } });
    if (record.expiresAt < new Date()) return null;
    return { userId: record.userId, codeVerifier: record.codeVerifier };
  }

  async deleteExpiredOAuthStates(): Promise<number> {
    const { count } = await this.prisma.corosOAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return count;
  }

  async deleteOAuthClient(): Promise<void> {
    await this.prisma.corosOAuthClient.deleteMany({});
  }
}
