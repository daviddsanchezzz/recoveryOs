import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GetWeightSummaryUseCase } from './application/use-cases/get-weight-summary.use-case';
import { GetAllWeightsUseCase } from './application/use-cases/get-all-weights.use-case';
import { LogWeightUseCase } from './application/use-cases/log-weight.use-case';
import { DeleteWeightUseCase } from './application/use-cases/delete-weight.use-case';
import { WEIGHT_REPOSITORY } from './domain/weight-repository.port';
import { PrismaWeightRepository } from './infrastructure/prisma-weight.repository';
import { WeightController } from './presentation/weight.controller';

@Module({
  imports: [AuthModule],
  controllers: [WeightController],
  providers: [
    LogWeightUseCase,
    GetWeightSummaryUseCase,
    GetAllWeightsUseCase,
    DeleteWeightUseCase,
    PrismaWeightRepository,
    {
      provide: WEIGHT_REPOSITORY,
      useExisting: PrismaWeightRepository,
    },
  ],
  exports: [WEIGHT_REPOSITORY, LogWeightUseCase, GetWeightSummaryUseCase, GetAllWeightsUseCase, DeleteWeightUseCase],
})
export class WeightModule {}
