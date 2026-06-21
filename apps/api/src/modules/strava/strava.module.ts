import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { HandleStravaCallbackUseCase } from './application/use-cases/handle-strava-callback.use-case';
import { GetStravaStatusUseCase } from './application/use-cases/get-strava-status.use-case';
import { SyncStravaUseCase } from './application/use-cases/sync-strava.use-case';
import { DisconnectStravaUseCase } from './application/use-cases/disconnect-strava.use-case';
import { HandleStravaWebhookUseCase } from './application/use-cases/handle-strava-webhook.use-case';
import { STRAVA_REPOSITORY } from './domain/strava-repository.port';
import { PrismaStravaRepository } from './infrastructure/prisma-strava.repository';
import { StravaApiClient } from './infrastructure/strava-api.client';
import { StravaController } from './presentation/strava.controller';

@Module({
  imports: [AuthModule, ActivityModule],
  controllers: [StravaController],
  providers: [
    HandleStravaCallbackUseCase,
    GetStravaStatusUseCase,
    SyncStravaUseCase,
    DisconnectStravaUseCase,
    HandleStravaWebhookUseCase,
    StravaApiClient,
    PrismaStravaRepository,
    { provide: STRAVA_REPOSITORY, useExisting: PrismaStravaRepository },
  ],
})
export class StravaModule {}
