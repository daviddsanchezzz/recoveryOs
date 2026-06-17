import { Module } from '@nestjs/common';
import { GetWeightSummaryUseCase } from './application/use-cases/get-weight-summary.use-case';
import { LogWeightUseCase } from './application/use-cases/log-weight.use-case';
import { WEIGHT_REPOSITORY } from './domain/weight-repository.port';
import { PrismaWeightRepository } from './infrastructure/prisma-weight.repository';
import { WeightController } from './presentation/weight.controller';

@Module({
  controllers: [WeightController],
  providers: [
    LogWeightUseCase,
    GetWeightSummaryUseCase,
    PrismaWeightRepository,
    {
      provide: WEIGHT_REPOSITORY,
      useExisting: PrismaWeightRepository,
    },
  ],
  exports: [WEIGHT_REPOSITORY, LogWeightUseCase, GetWeightSummaryUseCase],
})
export class WeightModule {}
