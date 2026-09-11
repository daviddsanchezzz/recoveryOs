import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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

function today(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class SyncCorosUseCase {
  private readonly logger = new Logger(SyncCorosUseCase.name);

  constructor(
    @Inject(COROS_REPOSITORY) private readonly corosRepo: CorosRepositoryPort,
    @Inject(SLEEP_REPOSITORY) private readonly sleepRepo: SleepRepositoryPort,
    private readonly mcpClient: CorosMcpClient,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  async execute(userId: string, date?: Date): Promise<SyncCorosResult> {
    const token = await this.corosRepo.findTokenByUser(userId);
    if (!token) throw new NotFoundException('COROS not connected');

    await this.corosRepo.updateSyncStatus(userId, { syncStatus: 'syncing', lastAttemptAt: new Date() });

    // An explicit date (used by the per-day history backfill) syncs only that single day.
    // With no date — the cron, the manual "Sync" button, and the open-app auto-sync — refresh
    // both yesterday (COROS may still finalize sleep/HRV for it after the cron's morning run)
    // and today (COROS's "last 7 days" window already includes today's live, partial steps/kcal).
    const dates = date ? [date] : [yesterday(), today()];
    const synced: string[] = [];
    const errors: string[] = [];

    try {
      for (const d of dates) {
        const dateStr = toDateOnly(d);
        await this.syncDailyHealth(userId, d, dateStr, synced, errors);
        await this.syncSleep(userId, d, dateStr, synced, errors);
      }
    } catch (error) {
      const reauth = error instanceof UnauthorizedError;
      this.logger.error(`COROS sync failed: ${(error as Error).message}`);
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

    this.logger.log(
      `COROS sync [${dates.map(toDateOnly).join(', ')}]: synced=[${synced.join(', ')}] errors=[${errors.join('; ')}]`,
    );

    return { synced, errors };
  }

  private async syncDailyHealth(userId: string, date: Date, dateStr: string, synced: string[], errors: string[]) {
    try {
      const result = await this.mcpClient.callTool(userId, 'queryDailyHealthData', { date: dateStr });
      if (result.isError) throw new Error(result.text || 'queryDailyHealthData returned an error');
      if (!result.text.includes(`--- ${dateStr.replace(/-/g, '')} ---`)) return;
      const parsed = parseDailyHealthData(result.text, dateStr);
      if (parsed.steps == null && parsed.activeCalories == null && parsed.stressAvg == null) {
        errors.push('dailyHealthData: parser extracted no fields — COROS response format may have changed');
        return;
      }
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
      if (new RegExp(`(?:^|\\n)${dateStr}\\n`).test(result.text)) {
        const parsed = parseSleepData(result.text, dateStr);
        durationH = parsed.durationH;
        score = parsed.score;
        sleepDataOk = true;
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      errors.push(`sleepData: ${(error as Error).message}`);
    }

    try {
      const hrvResult = await this.mcpClient.callTool(userId, 'querySleepHrv', { date: dateStr });
      if (hrvResult.isError) throw new Error(hrvResult.text || 'querySleepHrv returned an error');
      if (new RegExp(`(?:^|\\n)${dateStr}:`).test(hrvResult.text)) {
        const parsed = parseSleepHrv(hrvResult.text, dateStr);
        if (parsed.hrv != null) {
          await this.healthMetrics.upsertFromCoros(userId, date, { hrv: parsed.hrv });
        } else {
          errors.push('sleepHrv: parser extracted no HRV value — COROS response format may have changed');
        }
      }
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
      if (new RegExp(`(?:^|\\n)${dateStr}:`).test(rhrResult.text)) {
        const parsed = parseRestingHeartRate(rhrResult.text, dateStr);
        if (parsed.restingHeartRate != null) {
          await this.healthMetrics.upsertFromCoros(userId, date, { restingHeartRate: parsed.restingHeartRate });
        } else {
          errors.push('restingHeartRate: parser extracted no value — COROS response format may have changed');
        }
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
