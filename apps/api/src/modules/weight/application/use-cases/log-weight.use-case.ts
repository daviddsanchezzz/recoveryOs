import { Inject, Injectable } from '@nestjs/common';
import { WeightEntryEntity } from '../../domain/weight-entry.entity';
import { WEIGHT_REPOSITORY, WeightRepositoryPort } from '../../domain/weight-repository.port';
import { LogWeightDto } from '../dto/log-weight.dto';

@Injectable()
export class LogWeightUseCase {
  constructor(
    @Inject(WEIGHT_REPOSITORY)
    private readonly repository: WeightRepositoryPort,
  ) {}

  execute(input: LogWeightDto) {
    const entry = new WeightEntryEntity(input.id ?? crypto.randomUUID(), input.userId, input.date, input.weightKg);
    return this.repository.create(entry);
  }
}

