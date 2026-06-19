import { Module } from '@nestjs/common';
import { CreateInjuryUseCase } from './application/use-cases/create-injury.use-case';
import { DeleteInjuryLogUseCase } from './application/use-cases/delete-injury-log.use-case';
import { DeleteInjuryUseCase } from './application/use-cases/delete-injury.use-case';
import { GetUserInjuriesUseCase } from './application/use-cases/get-user-injuries.use-case';
import { LogPainUseCase } from './application/use-cases/log-pain.use-case';
import { UpdateInjuryUseCase } from './application/use-cases/update-injury.use-case';
import { INJURY_REPOSITORY } from './domain/injury-repository.port';
import { PrismaInjuryRepository } from './infrastructure/prisma-injury.repository';
import { InjuryController } from './presentation/injury.controller';

@Module({
  controllers: [InjuryController],
  providers: [
    CreateInjuryUseCase,
    GetUserInjuriesUseCase,
    UpdateInjuryUseCase,
    DeleteInjuryUseCase,
    LogPainUseCase,
    DeleteInjuryLogUseCase,
    PrismaInjuryRepository,
    { provide: INJURY_REPOSITORY, useExisting: PrismaInjuryRepository },
  ],
  exports: [INJURY_REPOSITORY, GetUserInjuriesUseCase],
})
export class InjuryModule {}
