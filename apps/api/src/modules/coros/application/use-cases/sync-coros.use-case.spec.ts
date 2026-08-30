import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { SyncCorosUseCase } from './sync-coros.use-case';
import { CorosRepositoryPort } from '../../domain/coros-repository.port';
import { CorosMcpClient } from '../../infrastructure/coros-mcp.client';
import { HealthMetricsService } from '../../../health-metrics/health-metrics.service';
import { SleepRepositoryPort } from '../../../sleep/domain/sleep-repository.port';

function makeToken() {
  return {
    id: 't1', userId: 'user-1', accessToken: 'a', refreshToken: 'r', expiresAt: new Date(),
    corosUserId: null, lastSyncAt: null, lastSuccessfulSyncAt: null, lastAttemptAt: null,
    syncStatus: 'idle', syncError: null, isExpired: false,
  } as never;
}

function makeDeps() {
  const corosRepo = {
    findTokenByUser: jest.fn().mockResolvedValue(makeToken()),
    updateSyncStatus: jest.fn(),
  } as unknown as jest.Mocked<CorosRepositoryPort>;
  const sleepRepo = { upsertBySource: jest.fn() } as unknown as jest.Mocked<SleepRepositoryPort>;
  const mcpClient = { callTool: jest.fn() } as unknown as jest.Mocked<CorosMcpClient>;
  const healthMetrics = { upsertFromCoros: jest.fn() } as unknown as jest.Mocked<HealthMetricsService>;
  return { corosRepo, sleepRepo, mcpClient, healthMetrics };
}

const OK_RESPONSES: Record<string, string> = {
  queryDailyHealthData: 'Steps: 11,358 | Calories: 472 kcal | Exercise: 5 min\nStress: Avg 29',
  querySleepData: 'Sleep Score: 82 | Duration: 7h 12m',
  querySleepHrv: 'Overnight HRV: 45 ms',
  queryRestingHeartRate: 'Resting HR: 52 bpm',
};

describe('SyncCorosUseCase', () => {
  const date = new Date('2026-08-29T00:00:00.000Z');

  it('throws when COROS is not connected', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    corosRepo.findTokenByUser.mockResolvedValue(null);
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    await expect(useCase.execute('user-1', date)).rejects.toThrow('COROS not connected');
  });

  it('parses and upserts daily health data and sleep, and marks the token success', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockImplementation(async (_userId, name) => ({ text: OK_RESPONSES[name], isError: false }));
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    const result = await useCase.execute('user-1', date);

    expect(result.errors).toEqual([]);
    expect(result.synced).toEqual(['dailyHealthData', 'sleep']);
    expect(healthMetrics.upsertFromCoros).toHaveBeenCalledWith('user-1', date, { steps: 11358, activeCalories: 472, stressAvg: 29 });
    expect(healthMetrics.upsertFromCoros).toHaveBeenCalledWith('user-1', date, { hrv: 45 });
    expect(healthMetrics.upsertFromCoros).toHaveBeenCalledWith('user-1', date, { restingHeartRate: 52 });
    expect(sleepRepo.upsertBySource).toHaveBeenCalledWith({ userId: 'user-1', date, durationH: 7.2, score: 82, source: 'coros' });
    expect(corosRepo.updateSyncStatus).toHaveBeenLastCalledWith('user-1', expect.objectContaining({ syncStatus: 'success', syncError: null }));
  });

  it('idempotency: running the same date twice routes both times through upsert, never a plain create', async () => {
    // The DB-level `@@unique([userId, date, source])` constraint (Task 1) is what actually
    // prevents a duplicate row; this test proves the use-case takes the upsert path both
    // times with identical keys, which is what makes that constraint sufficient — it does
    // not itself exercise Postgres (no test-DB harness exists in this codebase yet).
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockImplementation(async (_userId, name) => ({ text: OK_RESPONSES[name], isError: false }));
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    await useCase.execute('user-1', date);
    await useCase.execute('user-1', date);

    expect(sleepRepo.upsertBySource).toHaveBeenCalledTimes(2);
    expect(sleepRepo.upsertBySource).toHaveBeenNthCalledWith(1, { userId: 'user-1', date, durationH: 7.2, score: 82, source: 'coros' });
    expect(sleepRepo.upsertBySource).toHaveBeenNthCalledWith(2, { userId: 'user-1', date, durationH: 7.2, score: 82, source: 'coros' });
  });

  it('a sleep-related failure does not block daily health data from being saved', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockImplementation(async (_userId, name) => {
      if (name === 'queryDailyHealthData') return { text: OK_RESPONSES[name], isError: false };
      return { text: '', isError: true };
    });
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    const result = await useCase.execute('user-1', date);

    expect(result.synced).toEqual(['dailyHealthData']);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('sleepData:'), expect.stringContaining('sleepHrv:'), expect.stringContaining('restingHeartRate:')]),
    );
    expect(sleepRepo.upsertBySource).not.toHaveBeenCalled();
    expect(corosRepo.updateSyncStatus).toHaveBeenLastCalledWith('user-1', expect.objectContaining({ syncStatus: 'success' }));
  });

  it('marks the token reauth_required and rethrows on UnauthorizedError, without swallowing it', async () => {
    const { corosRepo, sleepRepo, mcpClient, healthMetrics } = makeDeps();
    mcpClient.callTool.mockRejectedValue(new UnauthorizedError());
    const useCase = new SyncCorosUseCase(corosRepo, sleepRepo, mcpClient, healthMetrics);

    await expect(useCase.execute('user-1', date)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(corosRepo.updateSyncStatus).toHaveBeenLastCalledWith('user-1', expect.objectContaining({ syncStatus: 'reauth_required' }));
  });
});
