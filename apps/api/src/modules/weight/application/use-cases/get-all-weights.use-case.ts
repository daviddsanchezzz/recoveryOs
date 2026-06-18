import { Inject, Injectable } from '@nestjs/common';
import { WEIGHT_REPOSITORY, WeightRepositoryPort } from '../../domain/weight-repository.port';

@Injectable()
export class GetAllWeightsUseCase {
  constructor(
    @Inject(WEIGHT_REPOSITORY)
    private readonly repository: WeightRepositoryPort,
  ) {}

  async execute(userId: string) {
    const entries = await this.repository.findByUser(userId);
    return entries.map((e) => ({
      id:       e.id,
      date:     e.date instanceof Date ? e.date.toISOString() : e.date,
      weightKg: e.weightKg,
    }));
  }
}
