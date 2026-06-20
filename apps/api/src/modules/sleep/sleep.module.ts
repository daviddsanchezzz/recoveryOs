import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DeleteSleepUseCase } from './application/use-cases/delete-sleep.use-case';
import { GetUserSleepUseCase } from './application/use-cases/get-user-sleep.use-case';
import { LogSleepUseCase } from './application/use-cases/log-sleep.use-case';
import { UpdateSleepUseCase } from './application/use-cases/update-sleep.use-case';
import { SLEEP_REPOSITORY } from './domain/sleep-repository.port';
import { PrismaSleepRepository } from './infrastructure/prisma-sleep.repository';
import { SleepController } from './presentation/sleep.controller';

@Module({
  imports: [AuthModule],
  controllers: [SleepController],
  providers: [
    LogSleepUseCase,
    GetUserSleepUseCase,
    UpdateSleepUseCase,
    DeleteSleepUseCase,
    PrismaSleepRepository,
    { provide: SLEEP_REPOSITORY, useExisting: PrismaSleepRepository },
  ],
  exports: [SLEEP_REPOSITORY, GetUserSleepUseCase],
})
export class SleepModule {}
