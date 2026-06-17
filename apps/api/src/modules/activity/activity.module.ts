import { Module } from '@nestjs/common';
import { GetActivitySummaryUseCase } from './application/use-cases/get-activity-summary.use-case';
import { LogActivityUseCase } from './application/use-cases/log-activity.use-case';
import { ACTIVITY_REPOSITORY } from './domain/activity-repository.port';
import { PrismaActivityRepository } from './infrastructure/prisma-activity.repository';
import { ActivityController } from './presentation/activity.controller';

@Module({
  controllers: [ActivityController],
  providers: [
    LogActivityUseCase,
    GetActivitySummaryUseCase,
    PrismaActivityRepository,
    {
      provide: ACTIVITY_REPOSITORY,
      useExisting: PrismaActivityRepository,
    },
  ],
  exports: [ACTIVITY_REPOSITORY, LogActivityUseCase, GetActivitySummaryUseCase],
})
export class ActivityModule {}

