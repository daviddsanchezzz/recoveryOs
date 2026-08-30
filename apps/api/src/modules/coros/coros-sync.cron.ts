import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { COROS_REPOSITORY, CorosRepositoryPort } from './domain/coros-repository.port';
import { SyncCorosUseCase } from './application/use-cases/sync-coros.use-case';

@Injectable()
export class CorosSyncCron {
  private readonly logger = new Logger(CorosSyncCron.name);

  constructor(
    @Inject(COROS_REPOSITORY) private readonly corosRepo: CorosRepositoryPort,
    private readonly syncCoros: SyncCorosUseCase,
  ) {}

  @Cron('0 8 * * *')
  async handleDailySync(): Promise<void> {
    const userIds = await this.corosRepo.findAllConnectedUserIds();
    this.logger.log(`Starting daily COROS sync for ${userIds.length} user(s)`);

    for (const userId of userIds) {
      try {
        const result = await this.syncCoros.execute(userId);
        this.logger.log(`Synced COROS for ${userId}: ${result.synced.join(', ') || 'nothing'}${result.errors.length ? ` (errors: ${result.errors.join('; ')})` : ''}`);
      } catch (error) {
        this.logger.error(`COROS sync failed for ${userId}: ${(error as Error).message}`);
      }
    }
  }
}
