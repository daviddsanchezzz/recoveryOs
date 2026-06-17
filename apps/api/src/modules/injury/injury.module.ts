import { Module } from '@nestjs/common';
import { GetInjurySummaryUseCase } from './application/use-cases/get-injury-summary.use-case';
import { LogInjuryUseCase } from './application/use-cases/log-injury.use-case';
import { INJURY_REPOSITORY } from './domain/injury-repository.port';
import { PrismaInjuryRepository } from './infrastructure/prisma-injury.repository';
import { InjuryController } from './presentation/injury.controller';

@Module({
  controllers: [InjuryController],
  providers: [
    LogInjuryUseCase,
    GetInjurySummaryUseCase,
    PrismaInjuryRepository,
    {
      provide: INJURY_REPOSITORY,
      useExisting: PrismaInjuryRepository,
    },
  ],
  exports: [INJURY_REPOSITORY, LogInjuryUseCase, GetInjurySummaryUseCase],
})
export class InjuryModule {}
