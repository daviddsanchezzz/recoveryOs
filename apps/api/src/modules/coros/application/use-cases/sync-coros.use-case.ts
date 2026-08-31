import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { COROS_REPOSITORY, CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';
import { SLEEP_REPOSITORY, SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';
import { parseDailyHealthData, parseRestingHeartRate, parseSleepData, parseSleepHrv } from '../coros-mapper';

export interface SyncCorosResult {
  synced: string[];
  errors: string[];
}

function yesterday(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class SyncCorosUseCase {
  constructor(
    @Inject(COROS_REPOSITORY) private readonly corosRepo: CorosRepositoryPort,
    @Inject(SLEEP_REPOSITORY) private readonly sleepRepo: SleepRepositoryPort,
    private readonly mcpClient: CorosMcpClient,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  async execute(userId: string, date: Date = yesterday()): Promise<SyncCorosResult> {
    const token = await this.corosRepo.findTokenByUser(userId);
    if (!token) throw new NotFoundException('COROS not connected');

    await this.corosRepo.updateSyncStatus(userId, { syncStatus: 'syncing', lastAttemptAt: new Date() });

    const dateStr = toDateOnly(date);
    const synced: string[] = [];
    const errors: string[] = [];

    try {
      await this.syncDailyHealth(userId, date, dateStr, synced, errors);
      await this.syncSleep(userId, date, dateStr, synced, errors);
    } catch (error) {
      const reauth = error instanceof UnauthorizedError;
      await this.corosRepo.updateSyncStatus(userId, {
        syncStatus: reauth ? 'reauth_required' : 'error',
        syncError: reauth ? 'COROS session expired — user must reconnect' : (error as Error).message,
      });
      throw error;
    }

    await this.corosRepo.updateSyncStatus(userId, {
      syncStatus: errors.length === 0 || synced.length > 0 ? 'success' : 'error',
      syncError: errors.length > 0 ? errors.join('; ') : null,
      ...(errors.length === 0 ? { lastSuccessfulSyncAt: new Date() } : {}),
    });

    return { synced, errors };
  }

  private async syncDailyHealth(userId: string, date: Date, dateStr: string, synced: string[], errors: string[]) {
    try {
      const result = await this.mcpClient.callTool(userId, 'queryDailyHealthData', { date: dateStr });
      if (result.isError) throw new Error(result.text || 'queryDailyHealthData returned an error');
      const parsed = parseDailyHealthData(result.text, dateStr);
      await this.healthMetrics.upsertFromCoros(userId, date, parsed);
      synced.push('dailyHealthData');
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`dailyHealthData: ${(error as Error).message}`);
    }
  }

  private async syncSleep(userId: string, date: Date, dateStr: string, synced: string[], errors: string[]) {
    let durationH: number | null = null;
    let score: number | null = null;
    let sleepDataOk = false;

    try {
      const result = await this.mcpClient.callTool(userId, 'querySleepData', { date: dateStr });
      if (result.isError) throw new Error(result.text || 'querySleepData returned an error');
      const parsed = parseSleepData(result.text, dateStr);
      durationH = parsed.durationH;
      score = parsed.score;
      sleepDataOk = true;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`sleepData: ${(error as Error).message}`);
    }

    try {
      const hrvResult = await this.mcpClient.callTool(userId, 'querySleepHrv', { date: dateStr });
      if (hrvResult.isError) throw new Error(hrvResult.text || 'querySleepHrv returned an error');
      const parsed = parseSleepHrv(hrvResult.text, dateStr);
      if (parsed.hrv != null) await this.healthMetrics.upsertFromCoros(userId, date, { hrv: parsed.hrv });
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`sleepHrv: ${(error as Error).message}`);
    }

    try {
      const rhrResult = await this.mcpClient.callTool(userId, 'queryRestingHeartRate', {
        startDate: dateStr,
        endDate: dateStr,
      });
      if (rhrResult.isError) throw new Error(rhrResult.text || 'queryRestingHeartRate returned an error');
      const parsed = parseRestingHeartRate(rhrResult.text, dateStr);
      if (parsed.restingHeartRate != null) {
        await this.healthMetrics.upsertFromCoros(userId, date, { restingHeartRate: parsed.restingHeartRate });
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`restingHeartRate: ${(error as Error).message}`);
    }

    if (sleepDataOk && durationH != null) {
      await this.sleepRepo.upsertBySource({ userId, date, durationH, score, source: 'coros' });
      synced.push('sleep');
    } else if (sleepDataOk) {
      errors.push('sleepData: response did not contain a parseable duration');
    }
  }
}
