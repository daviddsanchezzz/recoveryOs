import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthMetricsModule } from '../health-metrics/health-metrics.module';
import { SleepModule } from '../sleep/sleep.module';
import { HandleCorosCallbackUseCase } from './application/use-cases/handle-coros-callback.use-case';
import { GetCorosStatusUseCase } from './application/use-cases/get-coros-status.use-case';
import { SyncCorosUseCase } from './application/use-cases/sync-coros.use-case';
import { DisconnectCorosUseCase } from './application/use-cases/disconnect-coros.use-case';
import { COROS_REPOSITORY } from './domain/coros-repository.port';
import { PrismaCorosRepository } from './infrastructure/prisma-coros.repository';
import { CorosMcpClient } from './infrastructure/coros-mcp.client';
import { CorosController } from './presentation/coros.controller';

@Module({
  imports: [AuthModule, HealthMetricsModule, SleepModule],
  controllers: [CorosController],
  providers: [
    HandleCorosCallbackUseCase,
    GetCorosStatusUseCase,
    SyncCorosUseCase,
    DisconnectCorosUseCase,
    CorosMcpClient,
    PrismaCorosRepository,
    { provide: COROS_REPOSITORY, useExisting: PrismaCorosRepository },
  ],
  exports: [SyncCorosUseCase, COROS_REPOSITORY],
})
export class CorosModule {}
