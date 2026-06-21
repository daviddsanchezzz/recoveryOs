import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeleteActivityUseCase } from './application/use-cases/delete-activity.use-case';
import { GetActivitiesPaginatedUseCase } from './application/use-cases/get-activities-paginated.use-case';
import { GetActivitySummaryUseCase } from './application/use-cases/get-activity-summary.use-case';
import { GetTodayActivitiesUseCase } from './application/use-cases/get-today-activities.use-case';
import { LogActivityUseCase } from './application/use-cases/log-activity.use-case';
import { SetIsRaceUseCase } from './application/use-cases/set-is-race.use-case';
import { ACTIVITY_REPOSITORY } from './domain/activity-repository.port';
import { PrismaActivityRepository } from './infrastructure/prisma-activity.repository';
import { ActivityController } from './presentation/activity.controller';

@Module({
  imports: [AuthModule],
  controllers: [ActivityController],
  providers: [
    LogActivityUseCase,
    GetActivitySummaryUseCase,
    GetActivitiesPaginatedUseCase,
    GetTodayActivitiesUseCase,
    DeleteActivityUseCase,
    SetIsRaceUseCase,
    PrismaActivityRepository,
    {
      provide: ACTIVITY_REPOSITORY,
      useExisting: PrismaActivityRepository,
    },
  ],
  exports: [ACTIVITY_REPOSITORY, LogActivityUseCase, GetActivitySummaryUseCase],
})
export class ActivityModule {}
